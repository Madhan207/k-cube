"""
borrowers/serializers.py
"""
from rest_framework import serializers
from .models import Borrower
from accounts.models import User
from accounts.serializers import UserRegistrationSerializer


class BorrowerSerializer(serializers.ModelSerializer):
    masked_pan = serializers.ReadOnlyField()
    masked_aadhaar = serializers.ReadOnlyField()
    kyc_status = serializers.ReadOnlyField()
    full_address = serializers.SerializerMethodField()

    class Meta:
        model = Borrower
        fields = [
            'id', 'borrower_id', 'full_name', 'date_of_birth', 'gender',
            'father_name', 'mother_name', 'spouse_name',
            'mobile', 'alternate_mobile', 'email',
            'address_line1', 'address_line2', 'city', 'district', 'state', 'pin_code', 'country',
            'masked_pan', 'pan_verified', 'masked_aadhaar', 'aadhaar_verified',
            'status', 'profile_photo',
            'kyc_status', 'full_address',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'borrower_id', 'masked_pan', 'masked_aadhaar', 'kyc_status', 'created_at', 'updated_at']

    def get_full_address(self, obj):
        parts = [obj.address_line1, obj.address_line2, obj.city, obj.district, obj.state, obj.pin_code]
        return ', '.join(p for p in parts if p)


class BorrowerCreateSerializer(serializers.ModelSerializer):
    """Used by admin to create a borrower with a linked user account."""
    email = serializers.EmailField()
    mobile = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Borrower
        fields = [
            'id', 'borrower_id',
            'email', 'mobile', 'password',
            'full_name', 'date_of_birth', 'gender',
            'father_name', 'mother_name', 'spouse_name',
            'alternate_mobile',
            'address_line1', 'address_line2', 'city', 'district', 'state', 'pin_code',
            'pan_number', 'notes', 'kyc_status', 'status',
        ]
        read_only_fields = ['id', 'borrower_id', 'kyc_status', 'status']

    def create(self, validated_data):
        email = validated_data.pop('email')
        mobile = validated_data.pop('mobile')
        password = validated_data.pop('password')
        pan_number = validated_data.get('pan_number', '')

        user = User.objects.create_user(
            email=email, mobile=mobile, password=password,
            full_name=validated_data['full_name'],
            role=User.Role.BORROWER,
        )
        borrower = Borrower.objects.create(
            user=user,
            mobile=mobile,
            email=email,
            **validated_data
        )
        return borrower


class BorrowerSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and search results."""
    masked_pan = serializers.ReadOnlyField()
    masked_aadhaar = serializers.ReadOnlyField()
    kyc_status = serializers.ReadOnlyField()

    class Meta:
        model = Borrower
        fields = ['id', 'borrower_id', 'full_name', 'mobile', 'email', 'masked_pan', 'masked_aadhaar', 'kyc_status', 'status']
