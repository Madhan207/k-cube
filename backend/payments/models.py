"""
payments/models.py — PaymentSchedule and Payment records
"""
import uuid
from django.db import models
from django.utils import timezone


class PaymentSchedule(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        DUE = 'DUE', 'Due'
        PAID = 'PAID', 'Paid'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        OVERDUE = 'OVERDUE', 'Overdue'
        WAIVED = 'WAIVED', 'Waived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, related_name='payment_schedule')
    installment_no = models.PositiveSmallIntegerField()
    due_date = models.DateField(db_index=True)

    # Expected
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    principal_component = models.DecimalField(max_digits=12, decimal_places=2)
    interest_component = models.DecimalField(max_digits=12, decimal_places=2)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2)

    # Paid
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_remaining = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    waived_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waived_installments'
    )
    waiver_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_schedule'
        unique_together = [['loan', 'installment_no']]
        ordering = ['installment_no']
        indexes = [
            models.Index(fields=['due_date']),
            models.Index(fields=['status']),
            models.Index(fields=['loan', 'status']),
        ]

    def __str__(self):
        return f'{self.loan.loan_number} — Installment #{self.installment_no} — {self.status}'

    def save(self, *args, **kwargs):
        self.amount_remaining = self.amount_due - self.amount_paid
        super().save(*args, **kwargs)


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        UPI = 'UPI', 'UPI'
        CHEQUE = 'CHEQUE', 'Cheque'
        NEFT = 'NEFT', 'NEFT'
        RTGS = 'RTGS', 'RTGS'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(PaymentSchedule, on_delete=models.PROTECT, related_name='payments')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    transaction_reference = models.CharField(max_length=200, blank=True)
    bank_name = models.CharField(max_length=200, blank=True)
    cheque_number = models.CharField(max_length=50, blank=True)
    receipt_number = models.CharField(max_length=100, unique=True, blank=True)

    recorded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recorded_payments'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_payment'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['payment_date']),
            models.Index(fields=['transaction_reference']),
        ]

    def __str__(self):
        return f'Payment ₹{self.amount_paid} for {self.schedule}'
