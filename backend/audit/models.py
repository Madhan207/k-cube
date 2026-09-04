"""
audit/models.py — Immutable-style audit log
audit/middleware.py — Auto-logs requests
"""
import uuid
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Append-only audit trail. Never update or delete these records."""

    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        REGISTER = 'REGISTER', 'Register'
        PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Change'
        PROFILE_VIEW = 'PROFILE_VIEW', 'Profile Viewed'
        PROFILE_UPDATE = 'PROFILE_UPDATE', 'Profile Updated'
        KYC_INITIATED = 'KYC_INITIATED', 'KYC Initiated'
        KYC_PAN_SUBMITTED = 'KYC_PAN_SUBMITTED', 'PAN Submitted'
        KYC_PAN_VERIFIED = 'KYC_PAN_VERIFIED', 'PAN Verified'
        KYC_AADHAAR_CONSENT = 'KYC_AADHAAR_CONSENT', 'Aadhaar Consent Given'
        KYC_AADHAAR_OTP = 'KYC_AADHAAR_OTP', 'Aadhaar OTP Sent'
        KYC_AADHAAR_VERIFIED = 'KYC_AADHAAR_VERIFIED', 'Aadhaar Verified'
        KYC_APPROVED = 'KYC_APPROVED', 'KYC Approved'
        KYC_REJECTED = 'KYC_REJECTED', 'KYC Rejected'
        KYC_REVERIFICATION = 'KYC_REVERIFICATION', 'KYC Reverification Requested'
        DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD', 'Document Uploaded'
        DOCUMENT_VIEW = 'DOCUMENT_VIEW', 'Document Viewed'
        DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED', 'Document Verified'
        DOCUMENT_REJECTED = 'DOCUMENT_REJECTED', 'Document Rejected'
        LOAN_CREATED = 'LOAN_CREATED', 'Loan Created'
        LOAN_UPDATED = 'LOAN_UPDATED', 'Loan Updated'
        LOAN_APPROVED = 'LOAN_APPROVED', 'Loan Approved'
        LOAN_CALCULATED = 'LOAN_CALCULATED', 'Loan Calculated'
        PAYMENT_RECORDED = 'PAYMENT_RECORDED', 'Payment Recorded'
        PAYMENT_WAIVED = 'PAYMENT_WAIVED', 'Payment Waived'
        AGREEMENT_GENERATED = 'AGREEMENT_GENERATED', 'Agreement Generated'
        AGREEMENT_DOWNLOADED = 'AGREEMENT_DOWNLOADED', 'Agreement Downloaded'
        AGREEMENT_VERSION = 'AGREEMENT_VERSION', 'Agreement Version Created'
        ADMIN_ACTION = 'ADMIN_ACTION', 'Admin Action'
        ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED', 'Account Suspended'
        ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED', 'Account Reactivated'
        PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED', 'Password Reset Requested'
        PASSWORD_RESET_TOKEN_CREATED = 'PASSWORD_RESET_TOKEN_CREATED', 'Password Reset Token Created'
        PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED', 'Password Reset Failed'
        PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED', 'Password Reset Completed'
        PASSWORD_RESET_TOKEN_EXPIRED = 'PASSWORD_RESET_TOKEN_EXPIRED', 'Password Reset Token Expired'
        PASSWORD_RESET_TOKEN_REUSED = 'PASSWORD_RESET_TOKEN_REUSED', 'Password Reset Token Reused'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs'
    )
    actor_email = models.EmailField(blank=True)  # Snapshot in case user is deleted
    action = models.CharField(max_length=30, choices=Action.choices, db_index=True)
    target_type = models.CharField(max_length=50, blank=True)  # e.g., 'loan', 'borrower'
    target_id = models.CharField(max_length=100, blank=True, db_index=True)
    target_repr = models.CharField(max_length=500, blank=True)  # Human-readable ref

    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)  # Additional context

    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['target_type', 'target_id']),
        ]
        # Prevent updates — audit logs are append-only
        default_permissions = ('add', 'view')

    def __str__(self):
        return f'{self.timestamp} | {self.actor_email} | {self.action} | {self.target_repr}'

    def save(self, *args, **kwargs):
        if self.actor and not self.actor_email:
            self.actor_email = self.actor.email
        # Never allow updates
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            return  # silently ignore update attempts
        super().save(*args, **kwargs)
