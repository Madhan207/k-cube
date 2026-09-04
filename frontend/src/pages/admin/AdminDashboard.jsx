import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP, KYC_STATUS_MAP, PAYMENT_STATUS_MAP } from '../../utils/format';
import {
  Users, CreditCard, DollarSign, TrendingDown, CheckCircle2,
  AlertCircle, Clock, XCircle, ArrowRight, Activity
} from 'lucide-react';

function useDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [borrowers, loans, overdue, pendingKyc, recentLoans, recentPayments] = await Promise.all([
        api.get('/borrowers/?page_size=1'),
        api.get('/loans/?page_size=1'),
        api.get('/payments/schedules/?status=OVERDUE&page_size=1'),
        api.get('/kyc/?overall_status=PENDING_REVIEW&page_size=1'),
        api.get('/loans/?ordering=-created_at&page_size=5'),
        api.get('/payments/history/?ordering=-payment_date&page_size=5'),
      ]);
      return {
        totalBorrowers: borrowers.data.count || 0,
        totalLoans: loans.data.count || 0,
        overduePayments: overdue.data.count || 0,
        pendingKyc: pendingKyc.data.count || 0,
        recentLoans: recentLoans.data.results || [],
        recentPayments: recentPayments.data.results || [],
      };
    },
    staleTime: 60000,
  });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const statCards = [
    { label: 'Total Borrowers', value: stats?.totalBorrowers ?? '—', icon: Users, color: 'primary', link: '/admin/borrowers' },
    { label: 'Active Loans', value: stats?.totalLoans ?? '—', icon: CreditCard, color: 'gold', link: '/admin/loans' },
    { label: 'Pending KYC', value: stats?.pendingKyc ?? '—', icon: Clock, color: 'warning', link: '/admin/kyc' },
    { label: 'Overdue Payments', value: stats?.overduePayments ?? '—', icon: AlertCircle, color: 'danger', link: '/admin/payments' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user?.full_name} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, link }) => (
          <Link key={label} to={link} style={{ textDecoration: 'none' }}>
            <div className={`stat-card ${color === 'gold' ? 'gold' : color === 'danger' ? 'danger' : ''}`}>
              <div className="stat-card__icon" style={color === 'gold' ? { background: 'var(--color-gold-50)', color: 'var(--color-gold-dark)' } : color === 'danger' ? { background: 'var(--color-danger-bg)', color: 'var(--color-danger)' } : color === 'warning' ? { background: 'var(--color-warning-bg)', color: 'var(--color-warning)' } : {}}>
                <Icon size={22} />
              </div>
              {isLoading ? (
                <div className="spinner" style={{ marginBottom: '0.5rem' }} />
              ) : (
                <div className="stat-card__value">{value}</div>
              )}
              <div className="stat-card__label">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-Column Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Loans */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Loans</span>
            <Link to="/admin/loans" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : (
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Loan #</th>
                    <th>Borrower</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentLoans || []).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: '2rem' }}>No loans yet</td></tr>
                  ) : stats?.recentLoans.map(loan => {
                    const s = LOAN_STATUS_MAP[loan.status] || { label: loan.status, cls: 'badge-gray' };
                    return (
                      <tr key={loan.id}>
                        <td><Link to={`/admin/loans/${loan.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{loan.loan_number}</Link></td>
                        <td>{loan.borrower_name}</td>
                        <td>{formatCurrency(loan.principal_amount)}</td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Payments</span>
            <Link to="/admin/payments" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : (
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentPayments || []).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: '2rem' }}>No payments yet</td></tr>
                  ) : stats?.recentPayments.map(pmt => (
                    <tr key={pmt.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{pmt.receipt_number}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(pmt.amount_paid)}</td>
                      <td><span className="badge badge-gray">{pmt.payment_method}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(pmt.payment_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-6">
        <div className="card-header">
          <span style={{ fontWeight: 700 }}>Quick Actions</span>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/borrowers" className="btn btn-primary btn-sm"><Users size={15} /> Add Borrower</Link>
          <Link to="/admin/loans/create" className="btn btn-gold btn-sm"><CreditCard size={15} /> Create Loan</Link>
          <Link to="/admin/kyc" className="btn btn-outline btn-sm"><CheckCircle2 size={15} /> Review KYC</Link>
          <Link to="/admin/payments" className="btn btn-outline btn-sm"><DollarSign size={15} /> Record Payment</Link>
          <Link to="/admin/agreements" className="btn btn-outline btn-sm"><Activity size={15} /> View Agreements</Link>
          <Link to="/admin/audit-logs" className="btn btn-ghost btn-sm"><Activity size={15} /> Audit Logs</Link>
        </div>
      </div>
    </div>
  );
}
