"""
loans/calculator.py — Loan calculation engine (Flat Rate + Reducing Balance)
All financial math happens here on the backend ONLY.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


def round_currency(value):
    """Round to 2 decimal places using ROUND_HALF_UP."""
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def add_periods(start_date: date, period_number: int, frequency: str) -> date:
    """Add N periods to a date based on frequency."""
    if frequency == 'WEEKLY':
        return start_date + timedelta(weeks=period_number)
    elif frequency == 'MONTHLY':
        return start_date + relativedelta(months=period_number)
    elif frequency == 'FORTNIGHTLY':
        return start_date + timedelta(weeks=period_number * 2)
    raise ValueError(f'Unknown frequency: {frequency}')


def periodic_rate(annual_rate_percent: Decimal, frequency: str) -> Decimal:
    """Convert annual rate % to periodic rate as decimal."""
    annual = Decimal(annual_rate_percent) / Decimal('100')
    if frequency == 'WEEKLY':
        return annual / Decimal('52')
    elif frequency == 'MONTHLY':
        return annual / Decimal('12')
    elif frequency == 'FORTNIGHTLY':
        return annual / Decimal('26')
    raise ValueError(f'Unknown frequency: {frequency}')


def calculate_reducing_balance(
    principal: Decimal,
    annual_rate_percent: Decimal,
    num_installments: int,
    frequency: str,
    start_date: date,
    first_payment_date: date,
) -> dict:
    """
    Reducing balance (EMI) calculation.
    EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    """
    r = periodic_rate(annual_rate_percent, frequency)
    P = Decimal(principal)
    n = num_installments

    if r == 0:
        emi = round_currency(P / n)
    else:
        factor = (1 + r) ** n
        emi = round_currency(P * r * factor / (factor - 1))

    schedule = []
    balance = P
    total_interest = Decimal('0')
    total_principal = Decimal('0')

    # Row 0 — opening balance
    schedule.append({
        'installment_no': 0,
        'due_date': start_date.isoformat(),
        'payment': '0.00',
        'principal_paid': '0.00',
        'interest_charged': '0.00',
        'remaining_balance': str(round_currency(balance)),
        'status': 'OPENING',
    })

    current_date = first_payment_date
    for i in range(1, n + 1):
        interest_charged = round_currency(balance * r)
        principal_paid = round_currency(emi - interest_charged)

        # Last installment: pay off exact remaining balance
        if i == n:
            principal_paid = balance
            emi = round_currency(principal_paid + interest_charged)

        balance = round_currency(balance - principal_paid)
        total_interest += interest_charged
        total_principal += principal_paid

        due_date = add_periods(first_payment_date, i - 1, frequency)

        schedule.append({
            'installment_no': i,
            'due_date': due_date.isoformat(),
            'payment': str(emi),
            'principal_paid': str(principal_paid),
            'interest_charged': str(interest_charged),
            'remaining_balance': str(balance if balance > 0 else Decimal('0.00')),
            'status': 'UPCOMING',
        })

    end_date = add_periods(first_payment_date, n - 1, frequency)

    return {
        'principal': str(P),
        'annual_interest_rate': str(annual_rate_percent),
        'periodic_interest_rate': str(round_currency(r * 100)) + '%',
        'number_of_installments': n,
        'installment_amount': str(emi),
        'total_interest': str(round_currency(total_interest)),
        'total_repayment': str(round_currency(P + total_interest)),
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'interest_method': 'REDUCING_BALANCE',
        'amortization_schedule': schedule,
    }


def calculate_flat_rate(
    principal: Decimal,
    annual_rate_percent: Decimal,
    num_installments: int,
    frequency: str,
    start_date: date,
    first_payment_date: date,
) -> dict:
    """
    Flat Rate calculation.
    Total Interest = P × R × T  (T in years)
    EMI = (P + Total Interest) / N
    """
    P = Decimal(principal)
    annual = Decimal(annual_rate_percent) / Decimal('100')

    if frequency == 'WEEKLY':
        T = Decimal(num_installments) / Decimal('52')
    elif frequency == 'MONTHLY':
        T = Decimal(num_installments) / Decimal('12')
    elif frequency == 'FORTNIGHTLY':
        T = Decimal(num_installments) / Decimal('26')
    else:
        raise ValueError(f'Unknown frequency: {frequency}')

    total_interest = round_currency(P * annual * T)
    total_repayment = P + total_interest
    emi = round_currency(total_repayment / num_installments)
    periodic_interest = round_currency(total_interest / num_installments)

    schedule = []
    balance = P
    total_principal_paid = Decimal('0')

    schedule.append({
        'installment_no': 0,
        'due_date': start_date.isoformat(),
        'payment': '0.00',
        'principal_paid': '0.00',
        'interest_charged': '0.00',
        'remaining_balance': str(round_currency(balance)),
        'status': 'OPENING',
    })

    for i in range(1, num_installments + 1):
        principal_paid = round_currency(P / num_installments)
        if i == num_installments:
            principal_paid = round_currency(P - total_principal_paid)

        balance = round_currency(balance - principal_paid)
        total_principal_paid += principal_paid
        due_date = add_periods(first_payment_date, i - 1, frequency)

        schedule.append({
            'installment_no': i,
            'due_date': due_date.isoformat(),
            'payment': str(emi),
            'principal_paid': str(principal_paid),
            'interest_charged': str(periodic_interest),
            'remaining_balance': str(balance if balance > 0 else Decimal('0.00')),
            'status': 'UPCOMING',
        })

    end_date = add_periods(first_payment_date, num_installments - 1, frequency)

    return {
        'principal': str(P),
        'annual_interest_rate': str(annual_rate_percent),
        'periodic_interest_rate': str(round_currency(annual / (52 if frequency == 'WEEKLY' else 12) * 100)) + '%',
        'number_of_installments': num_installments,
        'installment_amount': str(emi),
        'total_interest': str(total_interest),
        'total_repayment': str(total_repayment),
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'interest_method': 'FLAT_RATE',
        'amortization_schedule': schedule,
    }


def calculate_loan(
    principal,
    annual_rate_percent,
    num_installments,
    frequency,
    start_date,
    first_payment_date,
    interest_method,
) -> dict:
    """Entry point — dispatches to the correct calculation method."""
    principal = Decimal(str(principal))
    annual_rate_percent = Decimal(str(annual_rate_percent))

    if interest_method == 'FLAT_RATE':
        return calculate_flat_rate(
            principal, annual_rate_percent, num_installments,
            frequency, start_date, first_payment_date
        )
    elif interest_method == 'REDUCING_BALANCE':
        return calculate_reducing_balance(
            principal, annual_rate_percent, num_installments,
            frequency, start_date, first_payment_date
        )
    else:
        raise ValueError(f'Unknown interest method: {interest_method}')
