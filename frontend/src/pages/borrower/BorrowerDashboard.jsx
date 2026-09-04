import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { borrowerService, paymentService, kycService } from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP, KYC_STATUS_MAP, PAYMENT_STATUS_MAP } from '../../utils/format';
import { CreditCard, Receipt, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function BorrowerDashboard() {
  const { user } = useAuth();

  const { data: borrower, isLoading: bLoad } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });

  const borrowerId = borrower?.id;

  const { data: loans, isLoading: lLoad } = useQuery({
    queryKey: ['my-loans'],
    queryFn: () => borrowerService.loans(borrowerId).then(r => r.data),
    enabled: !!borrowerId,
  });

  const { data: schedules, isLoading: sLoad } = useQuery({
    queryKey: ['my-schedules'],
    queryFn: () => paymentService.schedules({}).then(r => r.data.results || []),
    enabled: !!borrowerId,
  });

  const { data: kyc, isLoading: kLoad } = useQuery({
    queryKey: ['my-kyc'],
    queryFn: () => borrowerService.kycStatus(borrowerId).then(r => r.data),
    enabled: !!borrowerId,
  });

  const isLoading = bLoad || lLoad || sLoad || kLoad;

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!borrower) return <div className="alert alert-danger">Borrower profile not found. Please contact support.</div>;

  const activeLoans = (loans || []).filter(l => l.status === 'ACTIVE');
  const upcomingPayments = (schedules || []).filter(s => ['UPCOMING', 'DUE', 'OVERDUE'].includes(s.status)).slice(0, 3);
  const kycStatus = KYC_STATUS_MAP[borrower.kyc_status] || { label: borrower.kyc_status, cls: 'badge-gray' };

  return (
    <div>
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user?.full_name}</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
      >
        <motion.div variants={fadeInUp} className="stat-card gold">
          <div className="stat-card__icon" style={{ background: 'var(--color-gold-50)', color: 'var(--color-gold-dark)' }}><CreditCard size={22} /></div>
          <div className="stat-card__value">{activeLoans.length}</div>
          <div className="stat-card__label">Active Loans</div>
        </motion.div>

        <motion.div variants={fadeInUp} className="stat-card">
          <div className="stat-card__icon"><Receipt size={22} /></div>
          <div className="stat-card__value">{upcomingPayments.length}</div>
          <div className="stat-card__label">Upcoming Payments</div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Link to="/dashboard/kyc" style={{ textDecoration: 'none', display: 'block' }}>
            <div className={`stat-card ${borrower.kyc_status === 'VERIFIED' ? 'success' : 'danger'}`}>
              <div className="stat-card__icon" style={{ background: borrower.kyc_status === 'VERIFIED' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: borrower.kyc_status === 'VERIFIED' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                <ShieldCheck size={22} />
              </div>
              <div className="stat-card__value" style={{ fontSize: '1.25rem' }}>{kycStatus.label}</div>
              <div className="stat-card__label">KYC Status</div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {borrower.kyc_status !== 'VERIFIED' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="alert alert-warning mb-6"
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>KYC Verification Required</h4>
            <p style={{ fontSize: '0.875rem' }}>Your KYC is currently {kycStatus.label}. Please complete your PAN and Aadhaar verification to enable loan applications and agreements.</p>
            <Link to="/dashboard/kyc" className="btn btn-primary btn-sm mt-3">Complete KYC Now</Link>
          </div>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
      >
        {/* Active Loans */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>Your Active Loans</span>
            {borrower.kyc_status === 'VERIFIED' && (
              <Link to="/dashboard/apply" className="btn btn-primary btn-sm" style={{ marginRight: '0.5rem' }}>Apply for Loan</Link>
            )}
            <Link to="/dashboard/loans" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table className="table">
              <thead><tr><th>Loan #</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {activeLoans.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No active loans</td></tr>
                ) : activeLoans.slice(0, 5).map(l => {
                  const s = LOAN_STATUS_MAP[l.status];
                  return (
                    <tr key={l.id} className="table-row-hover">
                      <td><Link to={`/dashboard/loans/${l.id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{l.loan_number}</Link></td>
                      <td>{formatCurrency(l.principal_amount)}</td>
                      <td><span className={`badge ${s?.cls || 'badge-gray'}`}>{s?.label || l.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upcoming Payments */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>Upcoming Payments</span>
            <Link to="/dashboard/payments" className="btn btn-ghost btn-sm">View Schedule <ArrowRight size={14} /></Link>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table className="table">
              <thead><tr><th>Loan #</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {upcomingPayments.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No upcoming payments</td></tr>
                ) : upcomingPayments.map(p => {
                  const s = PAYMENT_STATUS_MAP[p.status];
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td><Link to={`/dashboard/loans/${p.loan}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.loan_number}</Link></td>
                      <td style={{ fontWeight: 600, color: p.status === 'OVERDUE' ? 'var(--color-danger)' : undefined }}>{formatDate(p.due_date)}</td>
                      <td>{formatCurrency(p.amount_remaining)}</td>
                      <td><span className={`badge ${s?.cls || 'badge-gray'}`}>{s?.label || p.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
