"""
kyc/providers.py — Clean provider interface for PAN and Aadhaar/e-KYC verification.
Real credentials are loaded from environment variables.
In dev/mock mode, returns simulated responses.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger('kcube')


class PANVerificationProvider:
    """
    Interface to an authorized PAN verification provider.
    Replace PAN_API_KEY / PAN_API_URL in .env to use a real provider.
    """

    def __init__(self):
        self.api_key = settings.PAN_API_KEY
        self.api_url = settings.PAN_API_URL
        self.provider = settings.PAN_API_PROVIDER
        self.is_mock = not self.api_key or self.provider == 'mock'

    def verify(self, pan_number: str, name: str, dob: str) -> dict:
        """
        Verify a PAN number.
        Returns:
            {
                'success': bool,
                'status': 'VERIFIED' | 'FAILED' | 'ERROR',
                'name_match': bool,
                'dob_match': bool,
                'provider_reference_id': str,
                'provider': str,
                'error': str (if any)
            }
        """
        if self.is_mock:
            return self._mock_verify(pan_number, name, dob)
        return self._real_verify(pan_number, name, dob)

    def _mock_verify(self, pan_number, name, dob):
        """Simulated verification for development. Always returns verified."""
        logger.warning(f'PAN verification running in MOCK mode for {pan_number[:5]}*****')
        return {
            'success': True,
            'status': 'VERIFIED',
            'name_match': True,
            'dob_match': True,
            'provider_reference_id': f'MOCK-PAN-{pan_number[:5]}-DEV',
            'provider': 'mock',
            'error': None,
        }

    def _real_verify(self, pan_number, name, dob):
        """Real provider API call — configure PAN_API_URL and PAN_API_KEY in .env"""
        try:
            response = requests.post(
                self.api_url,
                headers={'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'},
                json={'pan': pan_number, 'name': name, 'dob': dob},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            # Normalize response — adapt to your provider's actual response format
            return {
                'success': data.get('valid', False),
                'status': 'VERIFIED' if data.get('valid') else 'FAILED',
                'name_match': data.get('nameMatch', False),
                'dob_match': data.get('dobMatch', False),
                'provider_reference_id': data.get('referenceId', ''),
                'provider': self.provider,
                'error': None,
            }
        except Exception as e:
            logger.error(f'PAN verification API error: {e}')
            return {
                'success': False,
                'status': 'ERROR',
                'name_match': False,
                'dob_match': False,
                'provider_reference_id': '',
                'provider': self.provider,
                'error': str(e),
            }


class AadhaarEKYCProvider:
    """
    Interface to an authorized Aadhaar/e-KYC provider.
    IMPORTANT: Only compliant, UIDAI-authorized e-KYC flows are supported.
    Never implement unofficial Aadhaar number lookup or scraping.
    """

    def __init__(self):
        self.api_key = settings.AADHAAR_API_KEY
        self.api_url = settings.AADHAAR_API_URL
        self.provider = settings.AADHAAR_API_PROVIDER
        self.is_mock = not self.api_key or self.provider == 'mock'

    def initiate_otp(self, aadhaar_last4: str, consent: bool, consent_text: str) -> dict:
        """
        Initiate Aadhaar OTP-based e-KYC.
        We do NOT accept the full Aadhaar number here — only a reference.
        The actual Aadhaar number is entered directly on the provider's secure page or OTP flow.
        """
        if not consent:
            return {'success': False, 'error': 'Aadhaar e-KYC requires explicit user consent.'}

        if self.is_mock:
            return self._mock_initiate_otp()
        return self._real_initiate_otp(aadhaar_last4)

    def _mock_initiate_otp(self):
        logger.warning('Aadhaar e-KYC running in MOCK mode.')
        return {
            'success': True,
            'transaction_id': 'MOCK-AADHAAR-TXN-001',
            'otp_sent': True,
            'provider': 'mock',
            'message': 'OTP sent to registered mobile (MOCK MODE)',
        }

    def _real_initiate_otp(self, aadhaar_last4):
        try:
            response = requests.post(
                f'{self.api_url}/initiate',
                headers={'Authorization': f'Bearer {self.api_key}'},
                json={'aadhaar_last4': aadhaar_last4},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return {
                'success': True,
                'transaction_id': data.get('transactionId', ''),
                'otp_sent': True,
                'provider': self.provider,
                'message': 'OTP sent.',
            }
        except Exception as e:
            logger.error(f'Aadhaar e-KYC OTP initiation error: {e}')
            return {'success': False, 'error': str(e)}

    def verify_otp(self, transaction_id: str, otp: str, borrower_name: str, borrower_dob: str) -> dict:
        """Verify the OTP and get e-KYC result."""
        if self.is_mock:
            return self._mock_verify_otp(transaction_id)
        return self._real_verify_otp(transaction_id, otp, borrower_name, borrower_dob)

    def _mock_verify_otp(self, transaction_id):
        logger.warning('Aadhaar e-KYC OTP verify running in MOCK mode.')
        return {
            'success': True,
            'status': 'VERIFIED',
            'name_match': True,
            'dob_match': True,
            'address_match': True,
            'provider_reference_id': f'MOCK-EKYC-{transaction_id}',
            'provider': 'mock',
            'error': None,
        }

    def _real_verify_otp(self, transaction_id, otp, borrower_name, borrower_dob):
        try:
            response = requests.post(
                f'{self.api_url}/verify',
                headers={'Authorization': f'Bearer {self.api_key}'},
                json={'transactionId': transaction_id, 'otp': otp},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return {
                'success': data.get('verified', False),
                'status': 'VERIFIED' if data.get('verified') else 'FAILED',
                'name_match': data.get('nameMatch', False),
                'dob_match': data.get('dobMatch', False),
                'address_match': data.get('addressMatch', False),
                'provider_reference_id': data.get('referenceId', ''),
                'provider': self.provider,
                'error': None,
            }
        except Exception as e:
            logger.error(f'Aadhaar e-KYC verify error: {e}')
            return {'success': False, 'status': 'ERROR', 'error': str(e)}
