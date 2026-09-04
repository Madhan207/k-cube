"""
accounts/views.py — Auth views
"""
import hashlib
import secrets
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import OTPVerification
from .serializers import (
    CustomTokenObtainPairSerializer, UserRegistrationSerializer,
    UserProfileSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ValidateResetTokenSerializer, ResetPasswordSerializer,
    AdminUserSerializer,
)
from .emails import send_password_reset_email
from audit.utils import log_action
from accounts.permissions import IsAdminUser

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(email=request.data.get('email'))
            user.last_login_ip = get_client_ip(request)
            user.save(update_fields=['last_login_ip'])
            log_action(user, 'LOGIN', 'user', str(user.id), request)
        return response


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.is_mobile_verified = True
        user.save(update_fields=['is_mobile_verified'])
        
        refresh = RefreshToken.for_user(user)
        log_action(user, 'REGISTER_COMPLETED', 'user', str(user.id), request)
        
        return Response({
            'message': 'Registration successful.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class VerifyOTPView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        if not email or not otp:
            return Response({'error': 'Email and OTP are required.'}, status=400)

        try:
            user = User.objects.get(email=email)
            otp_hash = hashlib.sha256(otp.encode()).hexdigest()
            otp_obj = OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.Purpose.MOBILE_VERIFY,
                otp_hash=otp_hash,
                is_used=False
            ).first()

            if otp_obj and otp_obj.is_valid():
                otp_obj.is_used = True
                otp_obj.save()
                user.is_mobile_verified = True
                user.save()

                refresh = RefreshToken.for_user(user)
                log_action(user, 'MOBILE_VERIFIED', 'user', str(user.id), request)
                return Response({
                    'message': 'Mobile verified successfully.',
                    'user': UserProfileSerializer(user).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }, status=200)
            else:
                return Response({'error': 'Invalid or expired OTP.'}, status=400)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        log_action(user, 'PASSWORD_CHANGE', 'user', str(user.id), request)
        return Response({'message': 'Password changed successfully.'})


class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        try:
            user = User.objects.get(email=email)
            log_action(user, 'PASSWORD_RESET_REQUESTED', 'user', str(user.id), request)
            
            # Invalidate prior unused reset tokens for this user
            OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.Purpose.PASSWORD_RESET,
                is_used=False
            ).update(is_used=True)

            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            OTPVerification.objects.create(
                user=user,
                purpose=OTPVerification.Purpose.PASSWORD_RESET,
                otp_hash=token_hash,
                expires_at=timezone.now() + timedelta(minutes=30),
            )

            # Build frontend reset link
            reset_url = f"http://localhost:5173/reset-password/{uid}/{token}"
            send_password_reset_email(user, reset_url)
            log_action(user, 'PASSWORD_RESET_TOKEN_CREATED', 'user', str(user.id), request)
        except User.DoesNotExist:
            log_action(None, 'PASSWORD_RESET_REQUESTED', 'user', email, request, extra_data={'email': email})

        # Anti-enumeration response
        return Response({
            'message': 'If an account exists for this email address, you will receive password reset instructions shortly.'
        }, status=status.HTTP_200_OK)


class ValidateResetTokenView(generics.GenericAPIView):
    serializer_class = ValidateResetTokenSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            otp_obj = OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.Purpose.PASSWORD_RESET,
                otp_hash=token_hash
            ).order_by('-created_at').first()

            if not otp_obj:
                log_action(user, 'PASSWORD_RESET_FAILED', 'user', str(user.id), request, extra_data={'reason': 'invalid_token'})
                return Response({'valid': False, 'status': 'INVALID', 'error': 'Invalid password reset link.'}, status=400)

            if otp_obj.is_used:
                log_action(user, 'PASSWORD_RESET_TOKEN_REUSED', 'user', str(user.id), request)
                return Response({'valid': False, 'status': 'USED', 'error': 'This password reset link has already been used.'}, status=400)

            if timezone.now() >= otp_obj.expires_at:
                log_action(user, 'PASSWORD_RESET_TOKEN_EXPIRED', 'user', str(user.id), request)
                return Response({'valid': False, 'status': 'EXPIRED', 'error': 'This password reset link has expired.'}, status=400)

            return Response({'valid': True, 'status': 'VALID', 'email': user.email}, status=200)

        except Exception:
            return Response({'valid': False, 'status': 'INVALID', 'error': 'Invalid password reset link.'}, status=400)


class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            token_hash = hashlib.sha256(token.encode()).hexdigest()

            otp_obj = OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.Purpose.PASSWORD_RESET,
                otp_hash=token_hash
            ).order_by('-created_at').first()

            if not otp_obj:
                log_action(user, 'PASSWORD_RESET_FAILED', 'user', str(user.id), request, extra_data={'reason': 'invalid_token'})
                return Response({'error': 'Invalid password reset link.'}, status=400)

            if otp_obj.is_used:
                log_action(user, 'PASSWORD_RESET_TOKEN_REUSED', 'user', str(user.id), request)
                return Response({'error': 'This password reset link has already been used. Please request a new link.'}, status=400)

            if timezone.now() >= otp_obj.expires_at:
                log_action(user, 'PASSWORD_RESET_TOKEN_EXPIRED', 'user', str(user.id), request)
                return Response({'error': 'This password reset link has expired. Please request a new link.'}, status=400)

            # Validate password against Django policies
            try:
                validate_password(new_password, user=user)
            except DjangoValidationError as e:
                return Response({'error': e.messages[0]}, status=400)

            # Set new password
            user.set_password(new_password)
            user.save()

            # Mark token as consumed immediately
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])

            log_action(user, 'PASSWORD_RESET_COMPLETED', 'user', str(user.id), request)
            return Response({
                'message': 'Your password has been successfully updated. You can now log in using your new password.'
            }, status=200)

        except Exception:
            return Response({'error': 'Failed to reset password. Please request a new link.'}, status=400)


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            log_action(request.user, 'LOGOUT', 'user', str(request.user.id), request)
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=400)


# Admin: User Management
class AdminUserListView(generics.ListCreateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()
    lookup_field = 'id'


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
