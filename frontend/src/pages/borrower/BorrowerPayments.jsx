import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { paymentService } from '../../services/api';
import { formatCurrency, formatDate, PAYMENT_STATUS_MAP } from '../../utils/format';

export default function BorrowerPayments() {
  const [activeTab, setActiveTab] = useState('schedules');
  const [page, setPage] = useState(1);

  const { data: schedules, isLoading: schedLoading } = useQuery({
    queryKey: ['my-payment-schedules', page],
    queryFn: () => paymentService.schedules({ page }).then(r => r.data),
    enabled: activeTab === 'schedules',
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['my-payment-history', page],
    queryFn: () => paymentService.history({ page }).then(r => r.data),
    enabled: activeTab === 'history',
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">View your payment schedule and past transactions</p>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-gray-200)', marginBottom: '1.5rem' }}>
        {['schedules', 'history'].map(t => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setPage(1); }}
            style={{
              padding: '0.625rem 1.25rem', border: 'none', background: 'none',
              fontWeight: 600, fontSize: '0.875rem',
              color: activeTab === t ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: activeTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px', cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {t === 'schedules' ? 'Payment Schedule' : 'Receipt History'}
          </button>
        ))}
      </div>

      {activeTab === 'schedules' && (
        <div className="fade-in card">
          {schedLoading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Loan #</th><th>Inst. #</th><th>Due Date</th><th>Amount Due</th><th>Remaining</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(schedules?.results || []).length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No payment schedules found</td></tr>
                  ) : schedules.results.map(s => {
                    const st = PAYMENT_STATUS_MAP[s.status] || { label: s.status, cls: 'badge-gray' };
                    return (
                      <tr key={s.id}>
                        <td><Link to={`/dashboard/loans/${s.loan}`} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{s.loan_number}</Link></td>
                        <td>{s.installment_no}</td>
                        <td style={{ fontWeight: 600, color: s.status === 'OVERDUE' ? 'var(--color-danger)' : undefined }}>{formatDate(s.due_date)}</td>
                        <td>{formatCurrency(s.amount_due)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(s.amount_remaining)}</td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="fade-in card">
          {histLoading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Receipt #</th><th>Loan #</th><th>Inst. #</th><th>Amount Paid</th><th>Date</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {(history?.results || []).length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No payment history</td></tr>
                  ) : history.results.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.receipt_number}</td>
                      <td><Link to={`/dashboard/loans/${h.schedule.split('-')[0]}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{h.loan_number}</Link></td>
                      <td>{h.installment_no}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(h.amount_paid)}</td>
                      <td>{formatDate(h.payment_date)}</td>
                      <td><span className="badge badge-gray">{h.payment_method}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
