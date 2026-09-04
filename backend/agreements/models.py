"""
agreements/models.py — LoanAgreement with versioning and document hashing
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_agreement_number():
    year = timezone.now().year
    prefix = getattr(settings, 'AGREEMENT_ID_PREFIX', 'KCF-AGR')
    count = LoanAgreement.objects.filter(agreement_number__startswith=f'{prefix}-{year}').count()
    return f'{prefix}-{year}-{str(count + 1).zfill(6)}'


class LoanAgreement(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ACTIVE = 'ACTIVE', 'Active / Generated'
        SUPERSEDED = 'SUPERSEDED', 'Superseded'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, related_name='agreements')
    agreement_number = models.CharField(max_length=30, unique=True, db_index=True)
    template_version = models.CharField(max_length=20, default='v1.0')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Agreement content snapshot (JSON) — what was in the agreement at generation time
    agreement_data = models.JSONField(default=dict)

    # Storage references (never public URLs)
    pdf_storage_key = models.CharField(max_length=1000, blank=True)
    docx_storage_key = models.CharField(max_length=1000, blank=True)

    # Document integrity
    document_hash = models.CharField(max_length=128, blank=True)  # SHA-256 of PDF
    docx_hash = models.CharField(max_length=128, blank=True)

    # Version tracking
    version_number = models.PositiveSmallIntegerField(default=1)
    parent_agreement = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='revisions'
    )

    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_agreements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agreements_loanagreement'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['agreement_number']),
            models.Index(fields=['loan', 'status']),
        ]

    def __str__(self):
        return f'{self.agreement_number} v{self.version_number} — {self.status}'

    def save(self, *args, **kwargs):
        if not self.agreement_number:
            self.agreement_number = generate_agreement_number()
        super().save(*args, **kwargs)
