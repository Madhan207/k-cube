"""
borrowers/models.py — Borrower profile with sequential ID generation
"""
import uuid
from django.db import models
from django.conf import settings
from accounts.models import User


def generate_borrower_id():
    from django.utils import timezone
    from borrowers.models import Borrower
    year = timezone.now().year
    prefix = getattr(settings, 'BORROWER_ID_PREFIX', 'KCF-BOR')
    count = Borrower.objects.filter(borrower_id__startswith=f'{prefix}-{year}').count()
    return f'{prefix}-{year}-{str(count + 1).zfill(6)}'


class Borrower(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        ARCHIVED = 'ARCHIVED', 'Archived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name='borrower_profile')
    borrower_id = models.CharField(max_length=30, unique=True, db_index=True)

    # Personal info
    full_name = models.CharField(max_length=200)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    father_name = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    spouse_name = models.CharField(max_length=200, blank=True)

    # Contact
    mobile = models.CharField(max_length=15, db_index=True)
    alternate_mobile = models.CharField(max_length=15, blank=True)
    email = models.EmailField(db_index=True)

    # Address
    address_line1 = models.CharField(max_length=300)
    address_line2 = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=10)
    country = models.CharField(max_length=50, default='India')

    # KYC identifiers (stored safely — PAN & Aadhaar masked in serializer)
    pan_number = models.CharField(max_length=10, blank=True, db_index=True)
    pan_hash = models.CharField(max_length=128, blank=True, db_index=True)
    pan_verified = models.BooleanField(default=False)

    aadhaar_number = models.CharField(max_length=12, blank=True, db_index=True)
    aadhaar_hash = models.CharField(max_length=128, blank=True, db_index=True)
    aadhaar_verified = models.BooleanField(default=False)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    profile_photo = models.ImageField(upload_to='borrowers/photos/', null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_borrowers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'borrowers_borrower'
        indexes = [
            models.Index(fields=['borrower_id']),
            models.Index(fields=['mobile']),
            models.Index(fields=['email']),
            models.Index(fields=['pan_hash']),
            models.Index(fields=['aadhaar_hash']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'{self.borrower_id} — {self.full_name}'

    def save(self, *args, **kwargs):
        if not self.borrower_id:
            self.borrower_id = generate_borrower_id()
        import hashlib
        if self.pan_number and not self.pan_hash:
            self.pan_hash = hashlib.sha256(self.pan_number.upper().encode()).hexdigest()
        if self.aadhaar_number and not self.aadhaar_hash:
            self.aadhaar_hash = hashlib.sha256(self.aadhaar_number.encode()).hexdigest()
        super().save(*args, **kwargs)

    @property
    def masked_pan(self):
        """Returns PAN like ABCDE****F"""
        if self.pan_number and len(self.pan_number) == 10:
            return self.pan_number[:5] + '****' + self.pan_number[-1]
        return ''

    @property
    def masked_aadhaar(self):
        """Returns Aadhaar like XXXX XXXX 1234"""
        if self.aadhaar_number and len(self.aadhaar_number) == 12:
            return 'XXXX XXXX ' + self.aadhaar_number[-4:]
        return ''

    @property
    def kyc_status(self):
        try:
            return self.kyc_profile.overall_status
        except Exception:
            return 'NOT_STARTED'
