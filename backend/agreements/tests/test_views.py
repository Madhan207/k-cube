from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from borrowers.models import BorrowerProfile
from loans.models import Loan
from agreements.models import LoanAgreement

User = get_user_model()

class AgreementAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@kcube.com', password='adminpass', full_name='Admin')
        self.user = User.objects.create_user(email='test@example.com', password='password123', full_name='Test User')
        
        self.borrower = BorrowerProfile.objects.create(
            user=self.user,
            full_name='Test User',
            kyc_status='VERIFIED'
        )
        self.loan = Loan.objects.create(
            borrower=self.borrower,
            principal_amount=50000,
            interest_rate=18.0,
            number_of_installments=12,
            status='ACTIVE'
        )
        self.client.force_authenticate(user=self.admin)

    def test_generate_agreement(self):
        response = self.client.post(f'/api/agreements/{self.loan.id}/generate/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        agreement = LoanAgreement.objects.get(loan=self.loan)
        self.assertEqual(agreement.status, 'ACTIVE')
        self.assertEqual(agreement.version_number, 1)

    def test_preview_agreement(self):
        # Even without a saved agreement, we can preview the context
        response = self.client.get(f'/api/agreements/{self.loan.id}/preview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('borrower_name', response.data)
        self.assertEqual(response.data['borrower_name'], 'Test User')
