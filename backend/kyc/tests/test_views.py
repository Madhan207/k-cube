from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from borrowers.models import BorrowerProfile
from kyc.models import KYCProfile

User = get_user_model()

class KYCAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='test@example.com', password='password123', full_name='Test User')
        self.borrower = BorrowerProfile.objects.create(
            user=self.user,
            full_name='Test User',
            date_of_birth='1990-01-01',
            mobile='9876543210',
            gender='MALE'
        )
        self.client.force_authenticate(user=self.user)

    def test_get_kyc_status(self):
        response = self.client.get(f'/api/borrowers/{self.borrower.id}/kyc/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['overall_status'], 'NOT_STARTED')

    def test_verify_pan(self):
        # Using MOCK provider so ABCDE1234F should work
        response = self.client.post(f'/api/kyc/{self.borrower.borrower_id}/verify-pan/', {'pan_number': 'ABCDE1234F'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        kyc = KYCProfile.objects.get(borrower=self.borrower)
        self.assertEqual(kyc.pan_status, 'VERIFIED')

    def test_verify_aadhaar(self):
        response = self.client.post(f'/api/kyc/{self.borrower.borrower_id}/verify-aadhaar/', {'aadhaar_number': '123456789012'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        kyc = KYCProfile.objects.get(borrower=self.borrower)
        self.assertEqual(kyc.aadhaar_status, 'VERIFIED')
