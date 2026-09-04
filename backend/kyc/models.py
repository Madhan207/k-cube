"""
kyc/models.py — KYC Profile, Verification records, PAN and Aadhaar/e-KYC
"""
import uuid
from django.db import models
from django.utils import timezone


class KYCProfile(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Not Started'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        DOCUMENT_REQUIRED = 'DOCUMENT_REQUIRED', 'Document Required'
        PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired / Reverification Required'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.OneToOneField(
        'borrowers.Borrower', on_delete=models.PROTECT,
        related_name='kyc_profile'
    )

    # Individual verification statuses
    mobile_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    pan_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    aadhaar_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    address_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    bank_account_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    identity_match_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)

    # Overall KYC status
    overall_status = models.CharField(max_length=25, choices=Status.choices, default=Status.NOT_STARTED)

    # Admin override
    admin_approved = models.BooleanField(default=False)
    admin_approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='kyc_approvals'
    )
    admin_approved_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kyc_profile'
        indexes = [models.Index(fields=['overall_status'])]

    def __str__(self):
        return f'KYC — {self.borrower.borrower_id} — {self.overall_status}'

    def recalculate_overall_status(self):
        """Auto-compute overall status from individual verifications."""
        if self.admin_approved:
            self.overall_status = self.Status.VERIFIED
        elif self.pan_status == self.Status.REJECTED or self.aadhaar_status == self.Status.REJECTED or self.bank_account_status == self.Status.REJECTED:
            self.overall_status = self.Status.REJECTED
        elif self.pan_status == self.Status.VERIFIED and self.aadhaar_status == self.Status.VERIFIED and self.bank_account_status == self.Status.VERIFIED:
            self.overall_status = self.Status.VERIFIED
        elif self.pan_status == self.Status.NOT_STARTED and self.aadhaar_status == self.Status.NOT_STARTED and self.bank_account_status == self.Status.NOT_STARTED:
            self.overall_status = self.Status.NOT_STARTED
        else:
            self.overall_status = self.Status.IN_PROGRESS
        self.save()


class KYCVerification(models.Model):
    """Individual KYC verification event (PAN check, Aadhaar OTP, etc.)"""
    class VerificationType(models.TextChoices):
        PAN = 'PAN', 'PAN Verification'
        AADHAAR = 'AADHAAR', 'Aadhaar / e-KYC'
        MOBILE = 'MOBILE', 'Mobile OTP'
        EMAIL = 'EMAIL', 'Email OTP'
        DOCUMENT = 'DOCUMENT', 'Document Verification'

    class Status(models.TextChoices):
        INITIATED = 'INITIATED', 'Initiated'
        OTP_SENT = 'OTP_SENT', 'OTP Sent'
        PENDING = 'PENDING', 'Pending'
        VERIFIED = 'VERIFIED', 'Verified'
        FAILED = 'FAILED', 'Failed'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kyc_profile = models.ForeignKey(KYCProfile, on_delete=models.PROTECT, related_name='verifications')
    verification_type = models.CharField(max_length=20, choices=VerificationType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)

    # Consent (mandatory for Aadhaar)
    consent_given = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(null=True, blank=True)
    consent_ip = models.GenericIPAddressField(null=True, blank=True)
    consent_text = models.TextField(blank=True)

    # Provider details (never expose raw Aadhaar/PAN in logs)
    provider = models.CharField(max_length=100, blank=True)  # e.g., 'Signzy', 'IDfy'
    provider_reference_id = models.CharField(max_length=200, blank=True)  # Opaque ref token
    provider_request_id = models.CharField(max_length=200, blank=True)

    # Match results
    name_match = models.BooleanField(null=True, blank=True)
    dob_match = models.BooleanField(null=True, blank=True)
    address_match = models.BooleanField(null=True, blank=True)
    match_score = models.FloatField(null=True, blank=True)

    # Failure info
    failure_reason = models.TextField(blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)

    # Timestamps
    initiated_at = models.DateTimeField(default=timezone.now)
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'kyc_verification'
        ordering = ['-initiated_at']
        indexes = [
            models.Index(fields=['verification_type', 'status']),
            models.Index(fields=['kyc_profile']),
        ]

    def __str__(self):
        return f'{self.verification_type} — {self.status} — {self.kyc_profile.borrower.borrower_id}'


class BankAccount(models.Model):
    class AccountType(models.TextChoices):
        SAVINGS = 'SAVINGS', 'Savings Account'
        CURRENT = 'CURRENT', 'Current Account'
        SALARY = 'SALARY', 'Salary Account'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.OneToOneField('borrowers.Borrower', on_delete=models.CASCADE, related_name='bank_account')
    
    account_holder_name = models.CharField(max_length=200)
    bank_name = models.CharField(max_length=200)
    branch_name = models.CharField(max_length=200)
    account_number = models.CharField(max_length=50)
    ifsc_code = models.CharField(max_length=20)
    account_type = models.CharField(max_length=20, choices=AccountType.choices, default=AccountType.SAVINGS)
    
    is_primary = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kyc_bank_account'
        
    def __str__(self):
        return f'{self.bank_name} - {self.masked_account_number}'
        
    @property
    def masked_account_number(self):
        if self.account_number and len(self.account_number) >= 4:
            return 'XXXX XXXX ' + self.account_number[-4:]
        return 'XXXX'
