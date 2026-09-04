from rest_framework import serializers
from .models import LoanAgreement


class LoanAgreementSerializer(serializers.ModelSerializer):
    loan_number = serializers.CharField(source='loan.loan_number', read_only=True)
    borrower_name = serializers.CharField(source='loan.borrower.full_name', read_only=True)
    borrower_id = serializers.CharField(source='loan.borrower.borrower_id', read_only=True)

    class Meta:
        model = LoanAgreement
        fields = [
            'id', 'agreement_number', 'loan', 'loan_number',
            'borrower_name', 'borrower_id',
            'template_version', 'version_number', 'status',
            'document_hash', 'docx_hash',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'agreement_number', 'created_at', 'updated_at', 'document_hash', 'docx_hash']
