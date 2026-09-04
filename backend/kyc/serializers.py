from rest_framework import serializers
from .models import KYCProfile, KYCVerification, BankAccount

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            'id', 'account_holder_name', 'bank_name', 'branch_name', 
            'account_number', 'ifsc_code', 'account_type',
            'is_primary', 'is_verified', 'masked_account_number'
        ]
        read_only_fields = ['id', 'is_verified', 'masked_account_number']

class KYCVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCVerification
        fields = [
            'id', 'verification_type', 'status',
            'consent_given', 'consent_timestamp',
            'provider', 'provider_reference_id',
            'name_match', 'dob_match', 'address_match', 'match_score',
            'failure_reason', 'attempts',
            'initiated_at', 'verified_at',
        ]
        read_only_fields = fields


class KYCProfileSerializer(serializers.ModelSerializer):
    verifications = KYCVerificationSerializer(many=True, read_only=True)
    borrower_id = serializers.CharField(source='borrower.borrower_id', read_only=True)
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)
    masked_pan = serializers.CharField(source='borrower.masked_pan', read_only=True)
    masked_aadhaar = serializers.CharField(source='borrower.masked_aadhaar', read_only=True)
    bank_account = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()

    def get_bank_account(self, obj):
        try:
            return BankAccountSerializer(obj.borrower.bank_account).data
        except Exception:
            return None

    def get_documents(self, obj):
        from documents.models import Document
        from documents.serializers import DocumentSerializer
        docs = Document.objects.filter(borrower=obj.borrower, is_current=True)
        return DocumentSerializer(docs, many=True).data

    class Meta:
        model = KYCProfile
        fields = [
            'id', 'borrower_id', 'borrower_name', 'masked_pan', 'masked_aadhaar',
            'mobile_verified', 'email_verified',
            'pan_status', 'aadhaar_status', 'address_status', 'identity_match_status',
            'overall_status',
            'admin_approved', 'admin_notes', 'rejection_reason',
            'last_updated', 'created_at',
            'verifications', 'bank_account', 'documents',
        ]
        read_only_fields = ['id', 'borrower_id', 'borrower_name', 'last_updated', 'created_at', 'bank_account', 'documents']
