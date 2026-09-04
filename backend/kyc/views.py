"""
kyc/views.py — KYC API endpoints
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KYCProfile, KYCVerification, BankAccount
from .serializers import KYCProfileSerializer, KYCVerificationSerializer, BankAccountSerializer
from .providers import PANVerificationProvider, AadhaarEKYCProvider
from borrowers.models import Borrower
from accounts.permissions import IsAdminUser, IsOwnerOrAdmin
from audit.utils import log_action


class KYCProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = KYCProfileSerializer

    def get_object(self):
        borrower_id = self.kwargs.get('borrower_id')
        import uuid
        try:
            uuid.UUID(borrower_id)
            borrower = Borrower.objects.get(id=borrower_id)
        except (ValueError, TypeError, Borrower.DoesNotExist):
            borrower = Borrower.objects.get(borrower_id=borrower_id)
        profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)
        return profile

    def get_permissions(self):
        return [IsOwnerOrAdmin()]


import re
from pathlib import Path
from django.conf import settings
from documents.models import Document, document_upload_path


class PANVerifyView(APIView):
    """Submit PAN number and PAN card images for verification."""

    def post(self, request):
        pan_number = request.data.get('pan_number', '').upper().strip()
        borrower_id = request.data.get('borrower_id')

        # Validate 10-character PAN pattern
        pan_regex = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        if not re.match(pan_regex, pan_number):
            return Response({'error': 'Invalid PAN format. PAN must be 10 characters (e.g. ABCDE1234F).'}, status=400)

        try:
            if request.user.is_admin and borrower_id:
                borrower = Borrower.objects.get(borrower_id=borrower_id)
            else:
                borrower = getattr(request.user, 'borrower_profile', None)
                if not borrower and borrower_id:
                    borrower = Borrower.objects.get(borrower_id=borrower_id, user=request.user)
        except Borrower.DoesNotExist:
            return Response({'error': 'Borrower profile not found.'}, status=404)

        if not borrower:
            return Response({'error': 'Borrower profile not found.'}, status=404)

        # Check required PAN document images
        pan_front_doc = Document.objects.filter(borrower=borrower, document_type=Document.DocumentType.PAN_FRONT, is_current=True).first()
        pan_back_doc = Document.objects.filter(borrower=borrower, document_type=Document.DocumentType.PAN_BACK, is_current=True).first()

        # Handle direct file uploads in multipart body if present
        if not pan_front_doc and 'pan_front' in request.FILES:
            file_obj = request.FILES['pan_front']
            pan_front_doc = Document.objects.create(
                borrower=borrower, document_type=Document.DocumentType.PAN_FRONT,
                file_name=file_obj.name, file_size=file_obj.size, mime_type=file_obj.content_type,
                uploaded_by=request.user
            )
            rel_path = document_upload_path(pan_front_doc, file_obj.name)
            full_path = Path(settings.MEDIA_ROOT) / rel_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(file_obj.read())
            pan_front_doc.storage_key = rel_path
            pan_front_doc.save()

        if not pan_back_doc and 'pan_back' in request.FILES:
            file_obj = request.FILES['pan_back']
            pan_back_doc = Document.objects.create(
                borrower=borrower, document_type=Document.DocumentType.PAN_BACK,
                file_name=file_obj.name, file_size=file_obj.size, mime_type=file_obj.content_type,
                uploaded_by=request.user
            )
            rel_path = document_upload_path(pan_back_doc, file_obj.name)
            full_path = Path(settings.MEDIA_ROOT) / rel_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(file_obj.read())
            pan_back_doc.storage_key = rel_path
            pan_back_doc.save()

        if not pan_front_doc or not pan_back_doc:
            return Response({'error': 'Both PAN Front image and PAN Back image must be uploaded before verifying.'}, status=400)

        kyc_profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)

        # Call PAN provider
        provider = PANVerificationProvider()
        result = provider.verify(
            pan_number=pan_number,
            name=borrower.full_name,
            dob=str(borrower.date_of_birth),
        )

        verification = KYCVerification.objects.create(
            kyc_profile=kyc_profile,
            verification_type=KYCVerification.VerificationType.PAN,
            status=KYCVerification.Status.VERIFIED if result['success'] else KYCVerification.Status.FAILED,
            provider=result.get('provider', ''),
            provider_reference_id=result.get('provider_reference_id', ''),
            name_match=result.get('name_match'),
            dob_match=result.get('dob_match'),
            verified_at=timezone.now() if result['success'] else None,
            failure_reason=result.get('error', '') or '',
        )

        if result['success']:
            import hashlib
            borrower.pan_number = pan_number
            borrower.pan_hash = hashlib.sha256(pan_number.encode()).hexdigest()
            borrower.pan_verified = True
            borrower.save(update_fields=['pan_number', 'pan_hash', 'pan_verified'])
            kyc_profile.pan_status = KYCProfile.Status.VERIFIED
            pan_front_doc.verification_status = Document.VerificationStatus.VERIFIED
            pan_front_doc.save()
            pan_back_doc.verification_status = Document.VerificationStatus.VERIFIED
            pan_back_doc.save()
        else:
            kyc_profile.pan_status = KYCProfile.Status.REJECTED

        kyc_profile.recalculate_overall_status()

        log_action(request.user, 'KYC_PAN_VERIFIED' if result['success'] else 'KYC_PAN_SUBMITTED',
                   'borrower', borrower.borrower_id, request, target_repr=borrower.full_name)

        return Response({
            'success': result['success'],
            'status': kyc_profile.pan_status,
            'name_match': result.get('name_match'),
            'dob_match': result.get('dob_match'),
            'provider_reference_id': result.get('provider_reference_id'),
            'masked_pan': borrower.masked_pan,
        })


class AadhaarInitiateView(APIView):
    """Initiate Aadhaar e-KYC OTP with image validations."""

    def post(self, request):
        borrower_id = request.data.get('borrower_id')
        aadhaar_number = request.data.get('aadhaar_number', '').replace(' ', '').strip()
        consent = request.data.get('consent', True)
        consent_text = request.data.get('consent_text', 'I consent to Aadhaar verification for KYC.')

        if not consent:
            return Response({'error': 'Explicit consent is required for Aadhaar e-KYC.'}, status=400)

        aadhaar_regex = r'^[2-9]{1}[0-9]{11}$'
        if not re.match(aadhaar_regex, aadhaar_number):
            return Response({'error': 'Invalid 12-digit Aadhaar number format.'}, status=400)

        try:
            if request.user.is_admin and borrower_id:
                borrower = Borrower.objects.get(borrower_id=borrower_id)
            else:
                borrower = getattr(request.user, 'borrower_profile', None)
                if not borrower and borrower_id:
                    borrower = Borrower.objects.get(borrower_id=borrower_id, user=request.user)
        except Borrower.DoesNotExist:
            return Response({'error': 'Borrower profile not found.'}, status=404)

        if not borrower:
            return Response({'error': 'Borrower profile not found.'}, status=404)

        # Check Aadhaar Front and Back documents
        aadhaar_front_doc = Document.objects.filter(borrower=borrower, document_type=Document.DocumentType.AADHAAR_FRONT, is_current=True).first()
        aadhaar_back_doc = Document.objects.filter(borrower=borrower, document_type=Document.DocumentType.AADHAAR_BACK, is_current=True).first()

        if not aadhaar_front_doc and 'aadhaar_front' in request.FILES:
            file_obj = request.FILES['aadhaar_front']
            aadhaar_front_doc = Document.objects.create(
                borrower=borrower, document_type=Document.DocumentType.AADHAAR_FRONT,
                file_name=file_obj.name, file_size=file_obj.size, mime_type=file_obj.content_type,
                uploaded_by=request.user
            )
            rel_path = document_upload_path(aadhaar_front_doc, file_obj.name)
            full_path = Path(settings.MEDIA_ROOT) / rel_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(file_obj.read())
            aadhaar_front_doc.storage_key = rel_path
            aadhaar_front_doc.save()

        if not aadhaar_back_doc and 'aadhaar_back' in request.FILES:
            file_obj = request.FILES['aadhaar_back']
            aadhaar_back_doc = Document.objects.create(
                borrower=borrower, document_type=Document.DocumentType.AADHAAR_BACK,
                file_name=file_obj.name, file_size=file_obj.size, mime_type=file_obj.content_type,
                uploaded_by=request.user
            )
            rel_path = document_upload_path(aadhaar_back_doc, file_obj.name)
            full_path = Path(settings.MEDIA_ROOT) / rel_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(file_obj.read())
            aadhaar_back_doc.storage_key = rel_path
            aadhaar_back_doc.save()

        if not aadhaar_front_doc or not aadhaar_back_doc:
            return Response({'error': 'Both Aadhaar Front image and Aadhaar Back image must be uploaded before initiating OTP.'}, status=400)

        # Store encrypted/hashed Aadhaar in borrower profile
        import hashlib
        borrower.aadhaar_number = aadhaar_number
        borrower.aadhaar_hash = hashlib.sha256(aadhaar_number.encode()).hexdigest()
        borrower.save(update_fields=['aadhaar_number', 'aadhaar_hash'])

        kyc_profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)
        provider = AadhaarEKYCProvider()
        result = provider.initiate_otp(aadhaar_number[-4:], consent, consent_text)

        if result.get('success'):
            verification = KYCVerification.objects.create(
                kyc_profile=kyc_profile,
                verification_type=KYCVerification.VerificationType.AADHAAR,
                status=KYCVerification.Status.OTP_SENT,
                consent_given=True,
                consent_timestamp=timezone.now(),
                consent_ip=request.META.get('REMOTE_ADDR'),
                consent_text=consent_text,
                provider=result.get('provider', ''),
                provider_request_id=result.get('transaction_id', ''),
            )
            log_action(request.user, 'KYC_AADHAAR_CONSENT', 'borrower',
                       borrower.borrower_id, request, target_repr=borrower.full_name)
            return Response({
                'success': True,
                'transaction_id': result.get('transaction_id'),
                'verification_id': str(verification.id),
                'message': result.get('message'),
            })

        return Response({'success': False, 'error': result.get('error')}, status=400)


class AadhaarVerifyOTPView(APIView):
    """Verify Aadhaar OTP and complete e-KYC."""

    def post(self, request):
        verification_id = request.data.get('verification_id')
        otp = request.data.get('otp', '').strip()
        transaction_id = request.data.get('transaction_id', '')

        if not otp or len(otp) != 6:
            return Response({'error': 'Please enter a valid 6-digit OTP.'}, status=400)

        verification = None
        if verification_id:
            try:
                verification = KYCVerification.objects.get(
                    id=verification_id,
                    verification_type=KYCVerification.VerificationType.AADHAAR,
                )
            except (KYCVerification.DoesNotExist, ValueError):
                pass

        if not verification:
            borrower = getattr(request.user, 'borrower_profile', None)
            if borrower:
                verification = KYCVerification.objects.filter(
                    kyc_profile__borrower=borrower,
                    verification_type=KYCVerification.VerificationType.AADHAAR
                ).order_by('-initiated_at').first()

        if not verification:
            return Response({'error': 'Verification session not found.'}, status=404)

        verification.attempts += 1
        if verification.attempts > verification.max_attempts:
            return Response({'error': 'Maximum OTP attempts exceeded.'}, status=400)

        borrower = verification.kyc_profile.borrower
        provider = AadhaarEKYCProvider()
        result = provider.verify_otp(transaction_id, otp, borrower.full_name, str(borrower.date_of_birth))

        if result.get('success'):
            verification.status = KYCVerification.Status.VERIFIED
            verification.provider_reference_id = result.get('provider_reference_id', '')
            verification.name_match = result.get('name_match')
            verification.dob_match = result.get('dob_match')
            verification.address_match = result.get('address_match')
            verification.verified_at = timezone.now()
            verification.save()

            borrower.aadhaar_verified = True
            borrower.save(update_fields=['aadhaar_verified'])

            kyc_profile = verification.kyc_profile
            kyc_profile.aadhaar_status = KYCProfile.Status.VERIFIED

            Document.objects.filter(
                borrower=borrower,
                document_type__in=[Document.DocumentType.AADHAAR_FRONT, Document.DocumentType.AADHAAR_BACK]
            ).update(verification_status=Document.VerificationStatus.VERIFIED)

            kyc_profile.recalculate_overall_status()

            log_action(request.user, 'KYC_AADHAAR_VERIFIED', 'borrower',
                       borrower.borrower_id, request, target_repr=borrower.full_name)
            return Response({
                'success': True,
                'status': 'VERIFIED',
                'masked_aadhaar': borrower.masked_aadhaar
            })

        verification.status = KYCVerification.Status.FAILED
        verification.failure_reason = result.get('error', '')
        verification.save()
        return Response({'success': False, 'error': result.get('error')}, status=400)


class KYCAdminActionView(APIView):
    """Admin: Approve/Reject/Request KYC."""
    permission_classes = [IsAdminUser]

    def post(self, request, borrower_id):
        action_type = request.data.get('action')  # approve / reject / request_info
        notes = request.data.get('notes', '')

        try:
            borrower = Borrower.objects.get(borrower_id=borrower_id)
        except Borrower.DoesNotExist:
            return Response({'error': 'Borrower not found.'}, status=404)

        kyc_profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)

        if action_type == 'approve':
            kyc_profile.admin_approved = True
            kyc_profile.admin_approved_by = request.user
            kyc_profile.admin_approved_at = timezone.now()
            kyc_profile.admin_notes = notes
            kyc_profile.overall_status = KYCProfile.Status.VERIFIED
            kyc_profile.save()
            log_action(request.user, 'KYC_APPROVED', 'borrower', borrower_id, request,
                       target_repr=borrower.full_name, extra_data={'notes': notes})

        elif action_type == 'reject':
            kyc_profile.overall_status = KYCProfile.Status.REJECTED
            kyc_profile.rejection_reason = notes
            kyc_profile.save()
            log_action(request.user, 'KYC_REJECTED', 'borrower', borrower_id, request,
                       target_repr=borrower.full_name, extra_data={'reason': notes})

        elif action_type == 'request_info':
            kyc_profile.overall_status = KYCProfile.Status.DOCUMENT_REQUIRED
            kyc_profile.admin_notes = notes
            kyc_profile.save()
            log_action(request.user, 'KYC_REVERIFICATION', 'borrower', borrower_id, request,
                       target_repr=borrower.full_name)

        return Response(KYCProfileSerializer(kyc_profile).data)


class KYCRequestReviewView(APIView):
    """Borrower or Admin: Request KYC review."""
    permission_classes = [IsOwnerOrAdmin]

    def post(self, request, borrower_id):
        try:
            borrower = Borrower.objects.get(borrower_id=borrower_id, user=request.user) \
                if not request.user.is_admin else Borrower.objects.get(borrower_id=borrower_id)
        except Borrower.DoesNotExist:
            borrower = getattr(request.user, 'borrower_profile', None)
            if not borrower:
                return Response({'error': 'Borrower profile not found.'}, status=404)

        kyc_profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)
        kyc_profile.overall_status = KYCProfile.Status.PENDING_REVIEW
        kyc_profile.save()

        log_action(request.user, 'KYC_REVIEW_REQUESTED', 'borrower', borrower.borrower_id, request,
                   target_repr=borrower.full_name)

        return Response(KYCProfileSerializer(kyc_profile).data)


class KYCListAdminView(generics.ListAPIView):
    """Admin: List all KYC profiles with filters."""
    serializer_class = KYCProfileSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['overall_status']
    search_fields = ['borrower__full_name', 'borrower__borrower_id', 'borrower__mobile']

    def get_queryset(self):
        return KYCProfile.objects.select_related('borrower').all().order_by('-last_updated')

class BankAccountUpdateView(APIView):
    """Borrower: Update bank account details."""
    def post(self, request, borrower_id):
        try:
            borrower = Borrower.objects.get(borrower_id=borrower_id, user=request.user) \
                if not request.user.is_admin else Borrower.objects.get(borrower_id=borrower_id)
        except Borrower.DoesNotExist:
            return Response({'error': 'Borrower not found.'}, status=404)
        
        bank_account, _ = BankAccount.objects.get_or_create(borrower=borrower)
        serializer = BankAccountSerializer(bank_account, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            kyc_profile, _ = KYCProfile.objects.get_or_create(borrower=borrower)
            kyc_profile.bank_account_status = KYCProfile.Status.PENDING_REVIEW
            kyc_profile.recalculate_overall_status()
            log_action(request.user, 'BANK_ACCOUNT_UPDATED', 'borrower', borrower.borrower_id, request)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
