"""
lenders/models.py — Lender entity (K-CUBE Audit & FinServ as default)
"""
import uuid
from django.db import models


class Lender(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lender_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=300)
    address = models.TextField()
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pin_code = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='lender/logos/', null=True, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)

    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lenders_lender'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_default:
            # Ensure only one default lender
            Lender.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default(cls):
        default_lender = cls.objects.filter(is_default=True).first()
        if not default_lender:
            default_lender = cls.objects.first()
        if not default_lender:
            default_lender = cls.objects.create(
                lender_code='K-CUBE-001',
                name='K-CUBE Audit & FinServ',
                address='#7, KVS Complex, Salem Main Road, Kalipatti',
                phone='+91 98656 82992',
                email='hrkcube@gmail.com',
                is_default=True,
                is_active=True,
            )
        return default_lender
