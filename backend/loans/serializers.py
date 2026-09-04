"""
loans/serializers.py
"""
from rest_framework import serializers
from .models import Loan, LoanCalculation
from lenders.models import Lender


class LoanCalculationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanCalculation
        fields = [
            'id', 'principal', 'annual_interest_rate', 'periodic_interest_rate',
            'number_of_installments', 'installment_amount',
            'total_interest', 'total_repayment',
            'start_date', 'end_date', 'interest_method',
            'amortization_schedule', 'calculated_at',
        ]
        read_only_fields = fields


class LoanSerializer(serializers.ModelSerializer):
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)
    borrower_id = serializers.CharField(source='borrower.borrower_id', read_only=True)
    lender = serializers.PrimaryKeyRelatedField(queryset=Lender.objects.all(), required=False, allow_null=True)
    lender_name = serializers.CharField(source='lender.name', read_only=True)
    kyc_status = serializers.CharField(source='borrower.kyc_status', read_only=True)
    calculation = LoanCalculationSerializer(read_only=True)
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'loan_number',
            'borrower', 'borrower_name', 'borrower_id', 'kyc_status',
            'lender', 'lender_name',
            'principal_amount', 'interest_rate', 'interest_method',
            'repayment_frequency', 'number_of_installments',
            'loan_start_date', 'first_payment_date',
            'purpose', 'notes', 'status',
            'kyc_exception_approved',
            'created_at', 'updated_at',
            'calculation', 'outstanding_balance',
        ]
        read_only_fields = ['id', 'loan_number', 'created_at', 'updated_at']

    def get_outstanding_balance(self, obj):
        try:
            from payments.models import PaymentSchedule
            from django.db.models import Sum
            total_paid = obj.payment_schedule.aggregate(
                total=Sum('amount_paid')
            )['total'] or 0
            return str(obj.calculation.total_repayment - total_paid)
        except Exception:
            return str(obj.principal_amount)

    def validate(self, attrs):
        return attrs


class LoanSummarySerializer(serializers.ModelSerializer):
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)
    kyc_status = serializers.CharField(source='borrower.kyc_status', read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'loan_number', 'borrower_name', 'borrower_id',
            'principal_amount', 'interest_rate', 'repayment_frequency',
            'number_of_installments', 'loan_start_date', 'status', 'kyc_status',
        ]


class LoanCalculateSerializer(serializers.Serializer):
    principal_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    annual_interest_rate = serializers.DecimalField(max_digits=6, decimal_places=4)
    number_of_installments = serializers.IntegerField(min_value=1, max_value=600)
    repayment_frequency = serializers.ChoiceField(choices=['WEEKLY', 'MONTHLY', 'FORTNIGHTLY'])
    loan_start_date = serializers.DateField()
    first_payment_date = serializers.DateField()
    interest_method = serializers.ChoiceField(choices=['FLAT_RATE', 'REDUCING_BALANCE'])

class LoanApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = [
            'principal_amount', 'interest_rate', 'interest_method',
            'repayment_frequency', 'number_of_installments',
            'loan_start_date', 'first_payment_date', 'purpose',
        ]
