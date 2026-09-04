"""
agreements/views.py — Generate, version, and serve loan agreements
"""
import os
import hashlib
from django.http import HttpResponse, Http404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import LoanAgreement
from .serializers import LoanAgreementSerializer
from .generator import generate_docx, generate_pdf_from_html, compute_hash
from loans.models import Loan
from accounts.permissions import IsAdminUser, IsOwnerOrAdmin
from audit.utils import log_action


def build_agreement_data(loan: Loan, agreement: LoanAgreement = None) -> dict:
    """Assemble all dynamic fields for the agreement template from current loan data."""
    loan.refresh_from_db()
    if not hasattr(loan, 'calculation') or not loan.calculation:
        from loans.views import LoanViewSet
        LoanViewSet()._run_calculation(loan)
        loan.refresh_from_db()

    calc = loan.calculation
    borrower = loan.borrower
    lender = loan.lender

    METHOD_DISPLAY = {
        'FLAT_RATE': 'Flat Rate (P × R × T)',
        'REDUCING_BALANCE': 'Reducing Balance (EMI)',
    }

    address_parts = [p for p in [borrower.address_line1, borrower.city, borrower.district, borrower.state] if p]
    addr_str = ", ".join(address_parts)
    if borrower.pin_code:
        addr_str += f" - {borrower.pin_code}"

    agr_num = agreement.agreement_number if agreement else f"AGR-{loan.loan_number}"

    return {
        'agreement_number': agr_num,
        'agreement_date': timezone.now().date().isoformat(),
        'loan_number': loan.loan_number,
        # Lender
        'lender_name': lender.name if lender else 'Sakthipriyan MG Flex',
        'lender_address': lender.address if lender else 'Mallai, Namakkal, 637501',
        'lender_phone': lender.phone if lender else '',
        'lender_email': lender.email if lender else '',
        # Borrower
        'borrower_name': borrower.full_name,
        'borrower_id': borrower.borrower_id,
        'borrower_address': addr_str or 'Address Not Provided',
        'borrower_mobile': borrower.mobile,
        'borrower_pan_masked': borrower.masked_pan,
        # Loan terms
        'principal_amount': str(calc.principal),
        'interest_rate': str(loan.interest_rate),
        'interest_method': loan.interest_method,
        'interest_method_display': METHOD_DISPLAY.get(loan.interest_method, loan.interest_method),
        'repayment_frequency': loan.get_repayment_frequency_display(),
        'number_of_installments': calc.number_of_installments,
        'installment_amount': str(calc.installment_amount),
        'loan_start_date': str(loan.loan_start_date),
        'first_payment_date': str(loan.first_payment_date),
        'end_date': str(calc.end_date),
        'total_interest': str(calc.total_interest),
        'total_repayment': str(calc.total_repayment),
        'purpose': loan.purpose or 'Personal / Business Use',
        # Schedule
        'amortization_schedule': calc.amortization_schedule,
    }


class AgreementViewSet(ModelViewSet):
    queryset = LoanAgreement.objects.select_related('loan__borrower', 'loan__lender').all()
    serializer_class = LoanAgreementSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAdminUser()]
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return LoanAgreement.objects.none()
        if user.is_admin:
            return LoanAgreement.objects.select_related('loan__borrower', 'loan__lender').all()
        from django.db.models import Q
        return LoanAgreement.objects.filter(
            Q(loan__borrower__user=user) | Q(loan__borrower__email=user.email) | Q(loan__borrower__mobile=user.mobile)
        ).select_related('loan__borrower', 'loan__lender').distinct()

    def create(self, request, *args, **kwargs):
        """Generate a new loan agreement (or new version of existing one)."""
        loan_id = request.data.get('loan_id')
        try:
            loan = Loan.objects.select_related('borrower', 'lender', 'calculation').get(id=loan_id)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found.'}, status=404)

        if not hasattr(loan, 'calculation'):
            return Response({'error': 'Loan must be calculated before generating an agreement.'}, status=400)

        # Supersede existing active agreement
        existing = LoanAgreement.objects.filter(loan=loan, status=LoanAgreement.Status.ACTIVE).first()
        version_number = 1
        parent = None
        if existing:
            existing.status = LoanAgreement.Status.SUPERSEDED
            existing.save()
            version_number = existing.version_number + 1
            parent = existing

        # Build data and create agreement record
        agreement = LoanAgreement.objects.create(
            loan=loan,
            version_number=version_number,
            parent_agreement=parent,
            status=LoanAgreement.Status.DRAFT,
            created_by=request.user,
        )
        agreement_data = build_agreement_data(loan, agreement)
        agreement.agreement_data = agreement_data

        # Generate DOCX
        docx_bytes = generate_docx(agreement_data)
        docx_hash = compute_hash(docx_bytes)

        # Generate PDF
        pdf_bytes = generate_pdf_from_html(agreement_data)
        pdf_hash = compute_hash(pdf_bytes)

        # Store files
        docx_key = self._save_file(docx_bytes, f'agreements/{agreement.agreement_number}_v{version_number}.docx')
        pdf_key = self._save_file(pdf_bytes, f'agreements/{agreement.agreement_number}_v{version_number}.pdf')

        agreement.docx_storage_key = docx_key
        agreement.pdf_storage_key = pdf_key
        agreement.docx_hash = docx_hash
        agreement.document_hash = pdf_hash
        agreement.status = LoanAgreement.Status.ACTIVE
        agreement.save()

        # Update loan status to active if it was draft
        if loan.status == Loan.Status.DRAFT:
            loan.status = Loan.Status.ACTIVE
            loan.save()

        log_action(request.user, 'AGREEMENT_GENERATED', 'agreement',
                   agreement.agreement_number, request,
                   target_repr=f'{agreement.agreement_number} for {loan.loan_number}',
                   extra_data={'version': version_number})

        return Response(LoanAgreementSerializer(agreement).data, status=201)

    def _save_file(self, content: bytes, relative_path: str) -> str:
        """Save file to MEDIA_ROOT and return the storage key."""
        from django.conf import settings
        from pathlib import Path
        full_path = Path(settings.MEDIA_ROOT) / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'wb') as f:
            f.write(content)
        return relative_path

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Always regenerate PDF dynamically from current loan data."""
        agreement = self.get_object()
        log_action(request.user, 'AGREEMENT_DOWNLOADED', 'agreement',
                   agreement.agreement_number, request,
                   target_repr=agreement.agreement_number, extra_data={'format': 'pdf'})
        try:
            loan = agreement.loan
            agreement_data = build_agreement_data(loan, agreement)
            agreement.agreement_data = agreement_data
            agreement.save(update_fields=['agreement_data'])
            pdf_bytes = generate_pdf_from_html(agreement_data)
            self._save_file(pdf_bytes, agreement.pdf_storage_key or
                            f'agreements/{agreement.agreement_number}_v{agreement.version_number}.pdf')
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'PDF regen error: {e}')
            raise Http404('Could not generate PDF.')
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        borrower_clean = "".join(c for c in loan.borrower.full_name if c.isalnum() or c in (' ', '_', '-')).strip()
        filename = f"{borrower_clean}_{agreement.agreement_number}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    @action(detail=True, methods=['get'])
    def download_docx(self, request, pk=None):
        """Always regenerate DOCX dynamically from current loan data."""
        agreement = self.get_object()
        log_action(request.user, 'AGREEMENT_DOWNLOADED', 'agreement',
                   agreement.agreement_number, request,
                   target_repr=agreement.agreement_number, extra_data={'format': 'docx'})
        try:
            loan = agreement.loan
            agreement_data = build_agreement_data(loan, agreement)
            agreement.agreement_data = agreement_data
            agreement.save(update_fields=['agreement_data'])
            docx_bytes = generate_docx(agreement_data)
            self._save_file(docx_bytes, agreement.docx_storage_key or
                            f'agreements/{agreement.agreement_number}_v{agreement.version_number}.docx')
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'DOCX regen error: {e}')
            raise Http404('Could not generate DOCX.')
        response = HttpResponse(
            docx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        borrower_clean = "".join(c for c in loan.borrower.full_name if c.isalnum() or c in (' ', '_', '-')).strip()
        filename = f"{borrower_clean}_{agreement.agreement_number}.docx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    def _save_file(self, content: bytes, relative_path: str) -> str:
        """Save file to MEDIA_ROOT and return the storage key (overwriting if exists)."""
        from django.conf import settings
        from pathlib import Path
        full_path = Path(settings.MEDIA_ROOT) / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'wb') as f:
            f.write(content)
        return relative_path

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Return agreement data for frontend preview."""
        agreement = self.get_object()
        return Response(agreement.agreement_data)
