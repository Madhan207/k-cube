"""
loans/views.py
"""
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Loan, LoanCalculation
from .serializers import LoanSerializer, LoanSummarySerializer, LoanCalculateSerializer
from .calculator import calculate_loan
from accounts.permissions import IsAdminUser, IsOwnerOrAdmin
from audit.utils import log_action
from lenders.models import Lender


class LoanViewSet(ModelViewSet):
    queryset = Loan.objects.select_related('borrower', 'lender', 'calculation').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'repayment_frequency', 'interest_method']
    search_fields = ['loan_number', 'borrower__full_name', 'borrower__borrower_id', 'borrower__mobile']
    ordering_fields = ['created_at', 'loan_start_date', 'principal_amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanSummarySerializer
        return LoanSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'approve']:
            return [IsAdminUser()]
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Loan.objects.select_related('borrower', 'lender', 'calculation').all()
        return Loan.objects.filter(borrower__user=user).select_related('borrower', 'lender', 'calculation')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('lender'):
            default_lender = Lender.get_default()
            if default_lender:
                data['lender'] = str(default_lender.id)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        lender = serializer.validated_data.get('lender') or Lender.get_default()
        loan = serializer.save(created_by=self.request.user, lender=lender)
        # Auto-calculate on creation
        self._run_calculation(loan)
        log_action(self.request.user, 'LOAN_CREATED', 'loan',
                   loan.loan_number, self.request, target_repr=loan.loan_number)
        
        # Automatically generate loan agreement on loan creation
        try:
            from agreements.models import LoanAgreement
            from agreements.views import build_agreement_data
            from agreements.generator import generate_docx, generate_pdf_from_html, compute_hash
            from django.conf import settings
            from pathlib import Path

            version_number = 1
            agreement = LoanAgreement.objects.create(
                loan=loan,
                version_number=version_number,
                status=LoanAgreement.Status.DRAFT,
                created_by=self.request.user,
            )
            agreement_data = build_agreement_data(loan, agreement)
            agreement.agreement_data = agreement_data

            docx_bytes = generate_docx(agreement_data)
            docx_hash = compute_hash(docx_bytes)
            pdf_bytes = generate_pdf_from_html(agreement_data)
            pdf_hash = compute_hash(pdf_bytes)

            docx_rel = f'agreements/{agreement.agreement_number}_v{version_number}.docx'
            pdf_rel = f'agreements/{agreement.agreement_number}_v{version_number}.pdf'

            full_docx = Path(settings.MEDIA_ROOT) / docx_rel
            full_docx.parent.mkdir(parents=True, exist_ok=True)
            with open(full_docx, 'wb') as f:
                f.write(docx_bytes)

            full_pdf = Path(settings.MEDIA_ROOT) / pdf_rel
            full_pdf.parent.mkdir(parents=True, exist_ok=True)
            with open(full_pdf, 'wb') as f:
                f.write(pdf_bytes)

            agreement.docx_storage_key = docx_rel
            agreement.pdf_storage_key = pdf_rel
            agreement.docx_hash = docx_hash
            agreement.document_hash = pdf_hash
            agreement.status = LoanAgreement.Status.ACTIVE
            agreement.save()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Auto-generating agreement failed on loan creation: {e}")

    def _run_calculation(self, loan):
        result = calculate_loan(
            principal=loan.principal_amount,
            annual_rate_percent=loan.interest_rate,
            num_installments=loan.number_of_installments,
            frequency=loan.repayment_frequency,
            start_date=loan.loan_start_date,
            first_payment_date=loan.first_payment_date,
            interest_method=loan.interest_method,
        )
        calc, _ = LoanCalculation.objects.update_or_create(
            loan=loan,
            defaults={
                'principal': result['principal'],
                'annual_interest_rate': result['annual_interest_rate'],
                'periodic_interest_rate': result['periodic_interest_rate'].replace('%', ''),
                'number_of_installments': result['number_of_installments'],
                'installment_amount': result['installment_amount'],
                'total_interest': result['total_interest'],
                'total_repayment': result['total_repayment'],
                'start_date': result['start_date'],
                'end_date': result['end_date'],
                'interest_method': result['interest_method'],
                'amortization_schedule': result['amortization_schedule'],
            }
        )
        # Generate payment schedule
        self._create_payment_schedule(loan, result['amortization_schedule'])
        return calc

    def _create_payment_schedule(self, loan, schedule):
        from payments.models import PaymentSchedule
        from decimal import Decimal
        # Remove opening row (installment_no=0)
        installments = [s for s in schedule if s['installment_no'] > 0]
        PaymentSchedule.objects.filter(loan=loan).delete()
        bulk = []
        opening_balance = Decimal(schedule[0]['remaining_balance']) if schedule else loan.principal_amount
        for row in installments:
            closing_balance = Decimal(row['remaining_balance'])
            bulk.append(PaymentSchedule(
                loan=loan,
                installment_no=row['installment_no'],
                due_date=row['due_date'],
                amount_due=Decimal(row['payment']),
                principal_component=Decimal(row['principal_paid']),
                interest_component=Decimal(row['interest_charged']),
                opening_balance=opening_balance,
                closing_balance=closing_balance,
                amount_remaining=Decimal(row['payment']),
                status=PaymentSchedule.Status.UPCOMING,
            ))
            opening_balance = closing_balance
        PaymentSchedule.objects.bulk_create(bulk)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def calculate(self, request, pk=None):
        """Recalculate loan — admin only."""
        loan = self.get_object()
        calc = self._run_calculation(loan)
        log_action(request.user, 'LOAN_CALCULATED', 'loan',
                   loan.loan_number, request, target_repr=loan.loan_number)
        from loans.serializers import LoanCalculationSerializer
        return Response(LoanCalculationSerializer(calc).data)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Return the amortization schedule."""
        loan = self.get_object()
        try:
            return Response(loan.calculation.amortization_schedule)
        except LoanCalculation.DoesNotExist:
            return Response({'error': 'Loan not yet calculated.'}, status=400)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        loan = self.get_object()
        loan.status = Loan.Status.ACTIVE
        loan.approved_by = request.user
        from django.utils import timezone
        loan.approved_at = timezone.now()
        loan.save()
        log_action(request.user, 'LOAN_APPROVED', 'loan',
                   loan.loan_number, request, target_repr=loan.loan_number)

        # Auto-generate agreement if not exists
        if not loan.agreements.exists():
            try:
                from agreements.models import LoanAgreement
                from agreements.views import build_agreement_data
                from agreements.generator import generate_docx, generate_pdf_from_html, compute_hash
                from django.conf import settings
                from pathlib import Path

                version_number = 1
                agreement = LoanAgreement.objects.create(
                    loan=loan,
                    version_number=version_number,
                    status=LoanAgreement.Status.DRAFT,
                    created_by=request.user,
                )
                agreement_data = build_agreement_data(loan, agreement)
                agreement.agreement_data = agreement_data

                docx_bytes = generate_docx(agreement_data)
                docx_hash = compute_hash(docx_bytes)
                pdf_bytes = generate_pdf_from_html(agreement_data)
                pdf_hash = compute_hash(pdf_bytes)

                docx_rel = f'agreements/{agreement.agreement_number}_v{version_number}.docx'
                pdf_rel = f'agreements/{agreement.agreement_number}_v{version_number}.pdf'

                full_docx = Path(settings.MEDIA_ROOT) / docx_rel
                full_docx.parent.mkdir(parents=True, exist_ok=True)
                with open(full_docx, 'wb') as f:
                    f.write(docx_bytes)

                full_pdf = Path(settings.MEDIA_ROOT) / pdf_rel
                full_pdf.parent.mkdir(parents=True, exist_ok=True)
                with open(full_pdf, 'wb') as f:
                    f.write(pdf_bytes)

                agreement.docx_storage_key = docx_rel
                agreement.pdf_storage_key = pdf_rel
                agreement.docx_hash = docx_hash
                agreement.document_hash = pdf_hash
                agreement.status = LoanAgreement.Status.ACTIVE
                agreement.save()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Auto-generating agreement failed on loan approval: {e}")

        return Response({'message': 'Loan approved.', 'status': loan.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        loan = self.get_object()
        loan.status = Loan.Status.CANCELLED
        loan.save()
        log_action(request.user, 'LOAN_REJECTED', 'loan',
                   loan.loan_number, request, target_repr=loan.loan_number)
        return Response({'message': 'Loan application declined.', 'status': loan.status})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrAdmin])
    def apply(self, request):
        """Borrower: Apply for a loan."""
        from .serializers import LoanApplicationSerializer
        from django.db import models
        serializer = LoanApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        borrower = getattr(request.user, 'borrower_profile', None)
        if not borrower:
            borrower = Borrower.objects.filter(
                models.Q(user=request.user) | models.Q(email=request.user.email) | models.Q(mobile=request.user.mobile)
            ).first()
            
        if not borrower:
            return Response({'error': 'Borrower profile not found.'}, status=400)
            
        if borrower.kyc_status == 'REJECTED':
            return Response({'error': 'Your KYC status is REJECTED. Please re-submit your KYC documents before applying.'}, status=400)
            
        lender = Lender.get_default()
        if not lender:
            return Response({'error': 'System error: Default Lender not configured.'}, status=500)
            
        loan = Loan(
            borrower=borrower,
            lender=lender,
            status=Loan.Status.PENDING_APPROVAL,
            created_by=request.user,
            **serializer.validated_data
        )
        loan.save()
        self._run_calculation(loan)
        
        log_action(request.user, 'LOAN_APPLICATION_CREATED', 'loan', loan.loan_number, request, target_repr=loan.loan_number)
        
        return Response(LoanSerializer(loan).data, status=201)



class LoanCalculatePreviewView(APIView):
    """Preview calculation without saving — used by the frontend wizard."""

    def post(self, request):
        serializer = LoanCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        result = calculate_loan(
            principal=d['principal_amount'],
            annual_rate_percent=d['annual_interest_rate'],
            num_installments=d['number_of_installments'],
            frequency=d['repayment_frequency'],
            start_date=d['loan_start_date'],
            first_payment_date=d['first_payment_date'],
            interest_method=d['interest_method'],
        )
        return Response(result)
