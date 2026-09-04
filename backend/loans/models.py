"""
loans/models.py — Loan, LoanCalculation, PaymentSchedule
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_loan_number():
    year = timezone.now().year
    prefix = getattr(settings, 'LOAN_ID_PREFIX', 'KCF-LOAN')
    count = Loan.objects.filter(loan_number__startswith=f'{prefix}-{year}').count()
    return f'{prefix}-{year}-{str(count + 1).zfill(6)}'


class Loan(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ACTIVE = 'ACTIVE', 'Active'
        CLOSED = 'CLOSED', 'Closed'
        DEFAULTED = 'DEFAULTED', 'Defaulted'
        CANCELLED = 'CANCELLED', 'Cancelled'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'

    class RepaymentFrequency(models.TextChoices):
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'
        FORTNIGHTLY = 'FORTNIGHTLY', 'Fortnightly'

    class InterestMethod(models.TextChoices):
        FLAT_RATE = 'FLAT_RATE', 'Flat Rate (P × R × T)'
        REDUCING_BALANCE = 'REDUCING_BALANCE', 'Reducing Balance (EMI)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan_number = models.CharField(max_length=30, unique=True, db_index=True)
    borrower = models.ForeignKey(
        'borrowers.Borrower', on_delete=models.PROTECT, related_name='loans'
    )
    lender = models.ForeignKey(
        'lenders.Lender', on_delete=models.PROTECT, related_name='loans'
    )

    # Loan parameters
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('93.69'))  # Annual %
    interest_method = models.CharField(
        max_length=20, choices=InterestMethod.choices, default=InterestMethod.REDUCING_BALANCE
    )
    repayment_frequency = models.CharField(
        max_length=15, choices=RepaymentFrequency.choices, default=RepaymentFrequency.WEEKLY
    )
    number_of_installments = models.PositiveSmallIntegerField(default=25)
    loan_start_date = models.DateField()
    first_payment_date = models.DateField()
    purpose = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    kyc_exception_approved = models.BooleanField(default=False)
    kyc_exception_approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='kyc_exceptions'
    )

    # Metadata
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_loans'
    )
    approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_loans'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'loans_loan'
        indexes = [
            models.Index(fields=['loan_number']),
            models.Index(fields=['borrower', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['loan_start_date']),
        ]

    def __str__(self):
        return f'{self.loan_number} — {self.borrower.full_name} — ₹{self.principal_amount}'

    def save(self, *args, **kwargs):
        if not self.loan_number:
            self.loan_number = generate_loan_number()
        if not self.lender_id:
            from lenders.models import Lender
            default = Lender.get_default()
            if default:
                self.lender = default
        super().save(*args, **kwargs)


class LoanCalculation(models.Model):
    """Stores all computed financial values for a loan — source of truth."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.OneToOneField(Loan, on_delete=models.CASCADE, related_name='calculation')

    # Computed values
    principal = models.DecimalField(max_digits=14, decimal_places=2)
    annual_interest_rate = models.DecimalField(max_digits=6, decimal_places=4)
    periodic_interest_rate = models.DecimalField(max_digits=10, decimal_places=8)
    number_of_installments = models.PositiveSmallIntegerField()
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_interest = models.DecimalField(max_digits=14, decimal_places=2)
    total_repayment = models.DecimalField(max_digits=14, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    interest_method = models.CharField(max_length=20)

    # Full amortization schedule stored as JSON
    amortization_schedule = models.JSONField(default=list)

    calculated_at = models.DateTimeField(auto_now_add=True)
    recalculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'loans_calculation'

    def __str__(self):
        return f'Calculation for {self.loan.loan_number}'
