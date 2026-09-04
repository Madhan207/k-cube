"""
lenders/management/commands/create_default_lender.py
Idempotently creates the K-CUBE default lender on startup.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from lenders.models import Lender


class Command(BaseCommand):
    help = 'Create or update the default K-CUBE lender'

    def handle(self, *args, **options):
        lender, created = Lender.objects.update_or_create(
            lender_code='KCUBE-001',
            defaults={
                'name': settings.COMPANY_NAME,
                'address': settings.COMPANY_ADDRESS,
                'phone': settings.COMPANY_PHONE,
                'email': settings.COMPANY_EMAIL,
                'is_default': True,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created default lender: {lender.name}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated default lender: {lender.name}'))
