"""
accounts/tests.py — Tests for Authentication & Password Reset APIs
"""
import hashlib
import secrets
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OTPVerification
from audit.models import AuditLog

User = get_user_model()


class PasswordResetTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='testreset@example.com',
            mobile='9876543210',
            full_name='Test Reset User',
            password='OldPassword123!'
        )
        self.forgot_url = reverse('forgot_password')
        self.validate_url = reverse('reset_password_validate')
        self.reset_url = reverse('reset_password')

    def test_forgot_password_valid_user(self):
        response = self.client.post(self.forgot_url, {'email': 'testreset@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('If an account exists', response.data['message'])

        # Verify token created in database
        otp_obj = OTPVerification.objects.filter(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET
        ).first()
        self.assertIsNotNone(otp_obj)
        self.assertFalse(otp_obj.is_used)

        # Verify audit log
        self.assertTrue(AuditLog.objects.filter(action='PASSWORD_RESET_REQUESTED').exists())

    def test_forgot_password_non_existent_user_anti_enumeration(self):
        response = self.client.post(self.forgot_url, {'email': 'nonexistent@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify same generic response
        self.assertIn('If an account exists', response.data['message'])

    def test_validate_reset_token_valid(self):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        OTPVerification.objects.create(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET,
            otp_hash=token_hash,
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        response = self.client.post(self.validate_url, {'uid': uid, 'token': token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['email'], 'testreset@example.com')

    def test_validate_reset_token_expired(self):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        OTPVerification.objects.create(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET,
            otp_hash=token_hash,
            expires_at=timezone.now() - timedelta(minutes=5)  # Expired
        )

        response = self.client.post(self.validate_url, {'uid': uid, 'token': token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertEqual(response.data['status'], 'EXPIRED')

    def test_validate_reset_token_reused(self):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        OTPVerification.objects.create(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET,
            otp_hash=token_hash,
            is_used=True,  # Already used
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        response = self.client.post(self.validate_url, {'uid': uid, 'token': token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertEqual(response.data['status'], 'USED')

    def test_reset_password_success(self):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        otp_obj = OTPVerification.objects.create(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET,
            otp_hash=token_hash,
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        new_pass = 'NewSecurePassword123!'
        response = self.client.post(self.reset_url, {
            'uid': uid,
            'token': token,
            'new_password': new_pass,
            'confirm_password': new_pass
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('successfully updated', response.data['message'])

        # Verify password updated in DB
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_pass))

        # Verify token marked as used
        otp_obj.refresh_from_db()
        self.assertTrue(otp_obj.is_used)

        # Verify audit log recorded
        self.assertTrue(AuditLog.objects.filter(action='PASSWORD_RESET_COMPLETED').exists())

    def test_reset_password_mismatch(self):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        OTPVerification.objects.create(
            user=self.user,
            purpose=OTPVerification.Purpose.PASSWORD_RESET,
            otp_hash=token_hash,
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        response = self.client.post(self.reset_url, {
            'uid': uid,
            'token': token,
            'new_password': 'NewPassword123!',
            'confirm_password': 'DifferentPassword123!'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', response.data)
