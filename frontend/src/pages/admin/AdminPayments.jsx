import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { paymentService } from '../../services/api';
import { formatCurrency, formatDate, PAYMENT_STATUS_MAP } from '../../utils/format';
import { Search, Plus, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('schedules');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [recordModal, setRecordModal] = useState(null);

  const { data: schedules, isLoading: schedLoading } = useQuery({
    queryKey: ['payment-schedules', statusFilter, page],
    queryFn: () => paymentService.schedules({ status: statusFilter || undefined, page }).then(r => r.data),
    enabled: activeTab === 'schedules',
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['payment-history', page],
    queryFn: () => paymentService.history({ page }).then(r => r.data),
    enabled: activeTab === 'history',
  });

  const recordMutation = useMutation({
    mutationFn: (data) => paymentService.record(data),
    onSuccess: () => {
      qc.invalidateQueries(['payment-schedules']);
      qc.invalidateQueries(['payment-history']);
      toast.success('Payment recorded successfully!');
      setRecordModal(null);
    },
    onError: () => toast.error('Failed to record payment.'),
  });

  const handleRecordSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    recordMutation.mutate({
      schedule: recordModal.id,
      amount_paid: fd.get('amount_paid'),
      payment_date: fd.get('payment_date'),
      payment_method: fd.get('payment_method'),
      transaction_reference: fd.get('transaction_reference'),
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Manage payment schedules and record receipts</p>
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
            {t === 'schedules' ? 'Upcoming & Due' : 'Payment History'}
          </button>
        ))}
      </div>

      {activeTab === 'schedules' && (
        <div className="fade-in">
          <div className="card mb-4">
            <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-control" style={{ width: 200 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All Statuses</option>
                  {Object.entries(PAYMENT_STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            {schedLoading ? (
              <div className="page-loader"><div className="spinner" /></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Loan #</th><th>Inst. #</th><th>Due Date</th><th>Amount Due</th><th>Remaining</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {(schedules?.results || []).length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No schedules found</td></tr>
                    ) : schedules.results.map(s => {
                      const st = PAYMENT_STATUS_MAP[s.status] || { label: s.status, cls: 'badge-gray' };
                      return (
                        <tr key={s.id}>
                          <td><Link to={`/admin/loans/${s.loan}`} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{s.loan_number}</Link></td>
                          <td>{s.installment_no}</td>
                          <td style={{ fontWeight: 600, color: s.status === 'OVERDUE' ? 'var(--color-danger)' : undefined }}>{formatDate(s.due_date)}</td>
                          <td>{formatCurrency(s.amount_due)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(s.amount_remaining)}</td>
                          <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setRecordModal(s)}
                              disabled={s.status === 'PAID'}
                            >
                              <Plus size={14} /> Record Payment
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                  <tr><th>Receipt #</th><th>Loan #</th><th>Inst. #</th><th>Amount Paid</th><th>Date</th><th>Method</th><th>Ref</th></tr>
                </thead>
                <tbody>
                  {(history?.results || []).length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No payment history</td></tr>
                  ) : history.results.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.receipt_number}</td>
                      <td><Link to={`/admin/loans/${h.schedule.split('-')[0]}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{h.loan_number}</Link></td>
                      <td>{h.installment_no}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(h.amount_paid)}</td>
                      <td>{formatDate(h.payment_date)}</td>
                      <td><span className="badge badge-gray">{h.payment_method}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{h.transaction_reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {recordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Record Payment</span>
              <button onClick={() => setRecordModal(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleRecordSubmit}>
              <div className="modal-body">
                <div className="alert alert-info mb-4">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <div>Recording payment for <strong>{recordModal.loan_number}</strong> — Installment #{recordModal.installment_no}</div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount Remaining</label>
                    <input className="form-control" readOnly value={recordModal.amount_remaining} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid <span className="required">*</span></label>
                    <input name="amount_paid" className="form-control" type="number" step="0.01" max={recordModal.amount_remaining} defaultValue={recordModal.amount_remaining} required autoFocus />
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Payment Date <span className="required">*</span></label>
                    <input name="payment_date" className="form-control" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Method <span className="required">*</span></label>
                    <select name="payment_method" className="form-control" required>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction Reference (Optional)</label>
                  <input name="transaction_reference" className="form-control" placeholder="UPI Ref / UTR No" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRecordModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={recordMutation.isPending}>
                  {recordMutation.isPending ? <span className="spinner" /> : <CheckCircle2 size={16} />} Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
