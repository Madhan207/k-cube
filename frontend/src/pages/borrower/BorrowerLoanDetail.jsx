import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loanService, agreementService } from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP, downloadBlob } from '../../utils/format';
import { ArrowLeft, FileText, Download, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BorrowerLoanDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('details');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['my-loan', id],
    queryFn: () => loanService.get(id).then(r => r.data),
  });

  const { data: schedule } = useQuery({
    queryKey: ['my-loan-schedule', id],
    queryFn: () => loanService.schedule(id).then(r => r.data),
    enabled: !!id,
  });

  const downloadAgreement = async (agreementId, format) => {
    try {
      const fn = format === 'pdf' ? agreementService.downloadPDF : agreementService.downloadDOCX;
      const res = await fn(agreementId);
      downloadBlob(res.data, `agreement-${agreementId}.${format}`);
      toast.success(`${format.toUpperCase()} downloaded.`);
    } catch { toast.error(`Failed to download ${format.toUpperCase()}.`); }
  };

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!loan) return <div className="alert alert-danger">Loan not found.</div>;

  const statusInfo = LOAN_STATUS_MAP[loan.status] || { label: loan.status, cls: 'badge-gray' };
  const calc = loan.calculation;

  return (
    <motion.div
      style={{ maxWidth: 900 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/dashboard/loans" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{loan.loan_number}</h1>
          <p className="page-subtitle">Loan Overview</p>
        </div>
        <span className={`badge ${statusInfo.cls}`} style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem' }}>{statusInfo.label}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-gray-200)', marginBottom: '1.5rem' }}>
        {['details', 'schedule', 'agreements'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '0.625rem 1.25rem', border: 'none', background: 'none',
            fontWeight: 600, fontSize: '0.875rem',
            color: activeTab === t ? 'var(--color-primary)' : 'var(--color-gray-500)',
            borderBottom: activeTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px', cursor: 'pointer', textTransform: 'capitalize',
          }}>{t === 'agreements' ? 'Agreements & Docs' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="fade-in">
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 700 }}>Loan Parameters</span></div>
            <div className="card-body">
              {[
                ['Principal Amount', formatCurrency(loan.principal_amount)],
                ['Interest Rate', `${loan.interest_rate}% per annum`],
                ['Interest Method', loan.interest_method?.replace('_', ' ')],
                ['Repayment Plan', `${loan.number_of_installments} ${loan.repayment_frequency.toLowerCase()}`],
                ['Start Date', formatDate(loan.loan_start_date)],
                ['First Payment', formatDate(loan.first_payment_date)],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <span style={{ width: '45%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {calc && (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Summary</span></div>
              <div className="card-body">
                {[
                  ['Installment Amount', formatCurrency(calc.installment_amount)],
                  ['Total Interest', formatCurrency(calc.total_interest)],
                  ['Total Payable', formatCurrency(calc.total_repayment)],
                  ['Outstanding Balance', formatCurrency(loan.outstanding_balance)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                    <span style={{ width: '50%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{l}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: l === 'Total Payable' || l === 'Outstanding Balance' ? 800 : 500, color: l === 'Total Payable' ? 'var(--color-primary)' : undefined }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="card fade-in">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>Amortization Schedule</span>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table className="table amort-table">
              <thead>
                <tr><th>#</th><th>Due Date</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {(schedule || []).map(row => (
                  <tr key={row.installment_no} className={row.status === 'PAID' ? 'amort-row-paid' : row.status === 'OVERDUE' ? 'amort-row-overdue' : row.status === 'DUE' ? 'amort-row-due' : ''}>
                    <td style={{ fontWeight: 700 }}>{row.installment_no}</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(row.payment)}</td>
                    <td>{formatCurrency(row.principal_paid)}</td>
                    <td>{formatCurrency(row.interest_charged)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(row.remaining_balance)}</td>
                    <td><span className={`badge ${row.status === 'PAID' ? 'badge-success' : row.status === 'OVERDUE' ? 'badge-danger' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agreements Tab */}
      {activeTab === 'agreements' && (
        <div className="fade-in">
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Agreement #</th><th>Version</th><th>Status</th><th>Generated On</th><th>Downloads</th></tr>
                </thead>
                <tbody>
                  {(!loan.agreements || loan.agreements?.length === 0) ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No agreements available yet</td></tr>
                  ) : (loan.agreements || []).map(agr => (
                    <tr key={agr.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{agr.agreement_number}</td>
                      <td>v{agr.version_number}</td>
                      <td><span className={`badge ${agr.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>{agr.status}</span></td>
                      <td>{formatDate(agr.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={() => downloadAgreement(agr.id, 'pdf')}><Download size={14} /> PDF</button>
                          <button className="btn btn-gold btn-sm" onClick={() => downloadAgreement(agr.id, 'docx')}><FileText size={14} /> DOCX</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
