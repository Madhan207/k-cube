"""
documents/models.py — Secure document management with versioning and audit history
"""
import uuid
from django.db import models
from django.utils import timezone


def document_upload_path(instance, filename):
    import os
    ext = os.path.splitext(filename)[1]
    return f'documents/{instance.borrower.borrower_id}/{instance.document_type}/{instance.id}{ext}'


class Document(models.Model):
    class DocumentType(models.TextChoices):
        PAN = 'PAN', 'PAN Card'
        PAN_FRONT = 'PAN_FRONT', 'PAN Card Front'
        PAN_BACK = 'PAN_BACK', 'PAN Card Back'
        AADHAAR = 'AADHAAR', 'Aadhaar Card'
        AADHAAR_FRONT = 'AADHAAR_FRONT', 'Aadhaar Card Front'
        AADHAAR_BACK = 'AADHAAR_BACK', 'Aadhaar Card Back'
        BANK_STATEMENT = 'BANK_STATEMENT', 'Bank Statement'
        BANK_PASSBOOK = 'BANK_PASSBOOK', 'Bank Passbook'
        ADDRESS_PROOF = 'ADDRESS_PROOF', 'Address Proof'
        BANK_PROOF = 'BANK_PROOF', 'Bank Proof'
        PHOTOGRAPH = 'PHOTOGRAPH', 'Photograph'
        SIGNATURE = 'SIGNATURE', 'Signature'
        INCOME_PROOF = 'INCOME_PROOF', 'Income Proof'
        OTHER = 'OTHER', 'Other'

    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.ForeignKey(
        'borrowers.Borrower', on_delete=models.PROTECT, related_name='documents'
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file_name = models.CharField(max_length=500)
    # Storage key / path (never expose as public URL)
    storage_key = models.CharField(max_length=1000)
    file_size = models.PositiveIntegerField(default=0)  # bytes
    mime_type = models.CharField(max_length=100)
    file_hash = models.CharField(max_length=128, blank=True)  # SHA-256 of file

    # Verification
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    verified_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_documents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Versioning
    version = models.PositiveSmallIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    previous_version = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='newer_versions'
    )

    # Metadata
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='uploaded_documents'
    )
    upload_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents_document'
        ordering = ['-upload_date']
        indexes = [
            models.Index(fields=['borrower', 'document_type']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['is_current']),
        ]

    def __str__(self):
        return f'{self.document_type} — {self.borrower.borrower_id} v{self.version}'
