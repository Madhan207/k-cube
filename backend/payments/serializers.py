from decimal import Decimal
from rest_framework import serializers
from .models import PaymentSchedule, Payment


class PaymentSerializer(serializers.ModelSerializer):
    loan_number = serializers.CharField(source='schedule.loan.loan_number', read_only=True)
    installment_no = serializers.IntegerField(source='schedule.installment_no', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'schedule', 'loan_number', 'installment_no',
            'amount_paid', 'payment_date', 'payment_method',
            'transaction_reference', 'bank_name', 'cheque_number',
            'receipt_number', 'recorded_by', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at']


class PaymentScheduleSerializer(serializers.ModelSerializer):
    payments = PaymentSerializer(many=True, read_only=True)
    loan_number = serializers.CharField(source='loan.loan_number', read_only=True)

    class Meta:
        model = PaymentSchedule
        fields = [
            'id', 'loan', 'loan_number', 'installment_no', 'due_date',
            'amount_due', 'principal_component', 'interest_component',
            'opening_balance', 'closing_balance',
            'amount_paid', 'amount_remaining', 'status',
            'payments',
        ]
        read_only_fields = fields


class RecordPaymentSerializer(serializers.Serializer):
    schedule = serializers.PrimaryKeyRelatedField(queryset=PaymentSchedule.objects.all())
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
    transaction_reference = serializers.CharField(required=False, allow_blank=True, max_length=200)
    bank_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    cheque_number = serializers.CharField(required=False, allow_blank=True, max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True)
