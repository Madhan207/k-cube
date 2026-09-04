"""
loans/tests/test_calculator.py — Financial calculation unit tests
"""
from decimal import Decimal
from datetime import date
from django.test import TestCase
from loans.calculator import calculate_loan, calculate_reducing_balance, calculate_flat_rate


class TestReducingBalanceCalculation(TestCase):

    def test_basic_reducing_balance_weekly(self):
        result = calculate_loan(
            principal=10000,
            annual_rate_percent=Decimal('93.67'),
            num_installments=25,
            frequency='WEEKLY',
            start_date=date(2026, 4, 30),
            first_payment_date=date(2026, 5, 7),
            interest_method='REDUCING_BALANCE',
        )
        self.assertEqual(result['interest_method'], 'REDUCING_BALANCE')
        self.assertEqual(len(result['amortization_schedule']), 26)  # 0 + 25 installments
        # Total repayment = principal + total interest
        total = Decimal(result['total_repayment'])
        principal = Decimal(result['principal'])
        interest = Decimal(result['total_interest'])
        self.assertAlmostEqual(float(total), float(principal + interest), places=1)

    def test_basic_flat_rate_weekly(self):
        result = calculate_loan(
            principal=10000,
            annual_rate_percent=Decimal('93.67'),
            num_installments=25,
            frequency='WEEKLY',
            start_date=date(2026, 4, 30),
            first_payment_date=date(2026, 5, 7),
            interest_method='FLAT_RATE',
        )
        self.assertEqual(result['interest_method'], 'FLAT_RATE')
        self.assertEqual(len(result['amortization_schedule']), 26)

    def test_reducing_balance_monthly(self):
        result = calculate_loan(
            principal=50000,
            annual_rate_percent=Decimal('18.0'),
            num_installments=12,
            frequency='MONTHLY',
            start_date=date(2026, 1, 1),
            first_payment_date=date(2026, 2, 1),
            interest_method='REDUCING_BALANCE',
        )
        self.assertEqual(result['number_of_installments'], 12)
        # Final balance should be 0
        last_row = result['amortization_schedule'][-1]
        self.assertAlmostEqual(float(last_row['remaining_balance']), 0.0, places=1)

    def test_zero_interest_rate(self):
        result = calculate_loan(
            principal=12000,
            annual_rate_percent=Decimal('0.0'),
            num_installments=12,
            frequency='MONTHLY',
            start_date=date(2026, 1, 1),
            first_payment_date=date(2026, 2, 1),
            interest_method='REDUCING_BALANCE',
        )
        self.assertEqual(Decimal(result['total_interest']), Decimal('0.00'))
        self.assertEqual(Decimal(result['total_repayment']), Decimal('12000.00'))

    def test_schedule_row_count(self):
        for n in [10, 25, 50]:
            result = calculate_loan(
                principal=5000,
                annual_rate_percent=Decimal('12.0'),
                num_installments=n,
                frequency='MONTHLY',
                start_date=date(2026, 1, 1),
                first_payment_date=date(2026, 2, 1),
                interest_method='REDUCING_BALANCE',
            )
            self.assertEqual(len(result['amortization_schedule']), n + 1)

    def test_flat_rate_total_interest(self):
        """Flat rate: total_interest = P × R × T"""
        P = Decimal('10000')
        R = Decimal('0.12')  # 12% annual
        T = Decimal('25') / Decimal('52')  # 25 weeks
        expected_interest = P * R * T
        result = calculate_loan(
            principal=P,
            annual_rate_percent=Decimal('12.0'),
            num_installments=25,
            frequency='WEEKLY',
            start_date=date(2026, 1, 1),
            first_payment_date=date(2026, 1, 8),
            interest_method='FLAT_RATE',
        )
        self.assertAlmostEqual(float(Decimal(result['total_interest'])), float(expected_interest), places=1)
