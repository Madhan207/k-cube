"""
payments/views.py — Payment recording and tracking
"""
from decimal import Decimal
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import PaymentSchedule, Payment
from .serializers import PaymentScheduleSerializer, PaymentSerializer, RecordPaymentSerializer
from accounts.permissions import IsAdminUser, IsOwnerOrAdmin
from audit.utils import log_action


class PaymentScheduleViewSet(ModelViewSet):
    queryset = PaymentSchedule.objects.select_related('loan__borrower').all()
    serializer_class = PaymentScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'loan']
    ordering_fields = ['due_date', 'installment_no']
    ordering = ['installment_no']
    http_method_names = ['get', 'head', 'options']  # Read-only; created by loan calculator

    def get_permissions(self):
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        loan_id = self.request.query_params.get('loan_id')
        qs = PaymentSchedule.objects.select_related('loan__borrower')
        if not user.is_admin:
            qs = qs.filter(loan__borrower__user=user)
        if loan_id:
            qs = qs.filter(loan_id=loan_id)
        return qs


class RecordPaymentView(generics.CreateAPIView):
    """Admin records a payment against an installment."""
    serializer_class = RecordPaymentSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        schedule = d['schedule']
        amount_paid = Decimal(str(d['amount_paid']))

        # Create payment record
        import secrets, string
        receipt_no = 'RCP-' + ''.join(secrets.choice(string.digits) for _ in range(10))
        payment = Payment.objects.create(
            schedule=schedule,
            amount_paid=amount_paid,
            payment_date=d['payment_date'],
            payment_method=d['payment_method'],
            transaction_reference=d.get('transaction_reference', ''),
            bank_name=d.get('bank_name', ''),
            cheque_number=d.get('cheque_number', ''),
            receipt_number=receipt_no,
            recorded_by=request.user,
            notes=d.get('notes', ''),
        )

        # Update schedule
        schedule.amount_paid = sum(p.amount_paid for p in schedule.payments.all())
        if schedule.amount_paid >= schedule.amount_due:
            schedule.status = PaymentSchedule.Status.PAID
        elif schedule.amount_paid > 0:
            schedule.status = PaymentSchedule.Status.PARTIALLY_PAID
        schedule.save()

        log_action(request.user, 'PAYMENT_RECORDED', 'payment',
                   str(payment.id), request,
                   target_repr=f'₹{amount_paid} for {schedule.loan.loan_number} ##{schedule.installment_no}')

        return Response(PaymentSerializer(payment).data, status=201)


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['schedule__loan', 'payment_method']
    ordering = ['-payment_date']

    def get_permissions(self):
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related('schedule__loan__borrower')
        if not user.is_admin:
            qs = qs.filter(schedule__loan__borrower__user=user)
        return qs
