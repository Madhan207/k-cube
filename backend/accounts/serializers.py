"""
accounts/serializers.py
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['full_name'] = user.full_name
        token['role'] = user.role
        token['email'] = user.email
        token['mobile'] = user.mobile
        return token


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    # Borrower fields
    date_of_birth = serializers.DateField(required=True)
    gender = serializers.CharField(required=True)
    father_name = serializers.CharField(required=False, allow_blank=True, default='')
    alternate_mobile = serializers.CharField(required=False, allow_blank=True, default='')
    address_line1 = serializers.CharField(required=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True, default='')
    city = serializers.CharField(required=True)
    district = serializers.CharField(required=True)
    state = serializers.CharField(required=True)
    pin_code = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = [
            'email', 'mobile', 'full_name', 'password', 'password_confirm',
            'date_of_birth', 'gender', 'father_name', 'alternate_mobile',
            'address_line1', 'address_line2', 'city', 'district', 'state', 'pin_code'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        
        # Extract borrower data
        dob = validated_data.pop('date_of_birth')
        gender = validated_data.pop('gender')
        father_name = validated_data.pop('father_name', '')
        alt_mobile = validated_data.pop('alternate_mobile', '')
        addr1 = validated_data.pop('address_line1')
        addr2 = validated_data.pop('address_line2', '')
        city = validated_data.pop('city')
        district = validated_data.pop('district')
        state = validated_data.pop('state')
        pin = validated_data.pop('pin_code')
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            mobile=validated_data['mobile'],
            full_name=validated_data['full_name'],
            password=validated_data['password'],
        )
        
        # Create borrower profile
        from borrowers.models import Borrower
        Borrower.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            date_of_birth=dob,
            gender=gender,
            father_name=father_name,
            mobile=validated_data['mobile'],
            alternate_mobile=alt_mobile,
            email=validated_data['email'],
            address_line1=addr1,
            address_line2=addr2,
            city=city,
            district=district,
            state=state,
            pin_code=pin
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'mobile', 'full_name', 'role',
                  'is_active', 'is_email_verified', 'is_mobile_verified',
                  'date_joined', 'created_at']
        read_only_fields = ['id', 'role', 'date_joined', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ValidateResetTokenSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'mobile', 'full_name', 'role',
                  'is_active', 'is_email_verified', 'is_mobile_verified',
                  'date_joined', 'last_login', 'created_at']
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at']
