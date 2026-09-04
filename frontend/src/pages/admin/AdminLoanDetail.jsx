import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loanService, agreementService } from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP, downloadBlob } from '../../utils/format';
import {
  ArrowLeft, FileText, Download, Calculator, CheckCircle2,
  AlertTriangle, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoanDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => loanService.get(id).then(r => r.data),
  });

  const { data: schedule } = useQuery({
    queryKey: ['loan-schedule', id],
    queryFn: () => loanService.schedule(id).then(r => r.data),
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: () => agreementService.generate(id),
    onSuccess: (res) => { qc.invalidateQueries(['loan', id]); toast.success(`Agreement ${res.data.agreement_number} generated!`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Agreement generation failed.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => loanService.approve(id),
    onSuccess: () => { qc.invalidateQueries(['loan', id]); toast.success('Loan approved successfully!'); },
    onError: () => toast.error('Failed to approve loan.'),
  });

  const declineMutation = useMutation({
    mutationFn: () => loanService.decline(id),
    onSuccess: () => { qc.invalidateQueries(['loan', id]); toast.success('Loan application declined.'); },
    onError: () => toast.error('Failed to decline loan application.'),
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
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/admin/loans" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{loan.loan_number}</h1>
          <p className="page-subtitle">{loan.borrower_name} · {loan.lender_name}</p>
        </div>
        <span className={`badge ${statusInfo.cls}`} style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem' }}>{statusInfo.label}</span>
        
        {(loan.status === 'DRAFT' || loan.status === 'PENDING_APPROVAL') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || declineMutation.isPending}>
              <CheckCircle2 size={14} /> Approve Loan
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Are you sure you want to decline this loan application?')) declineMutation.mutate(); }} disabled={approveMutation.isPending || declineMutation.isPending}>
              Decline Loan
            </button>
          </div>
        )}
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
          }}>{t === 'agreements' ? 'Agreements' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="fade-in">
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 700 }}>Loan Parameters</span></div>
            <div className="card-body">
              {[
                ['Loan Number', loan.loan_number],
                ['Principal Amount', formatCurrency(loan.principal_amount)],
                ['Interest Rate', `${loan.interest_rate}% per annum`],
                ['Interest Method', loan.interest_method?.replace('_', ' ')],
                ['Frequency', loan.repayment_frequency],
                ['Installments', loan.number_of_installments],
                ['Start Date', formatDate(loan.loan_start_date)],
                ['First Payment', formatDate(loan.first_payment_date)],
                ['Purpose', loan.purpose || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <span style={{ width: '45%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: '0.9rem' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {calc ? (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Calculation Summary</span></div>
              <div className="card-body">
                {[
                  ['Installment Amount', formatCurrency(calc.installment_amount)],
                  ['Total Interest', formatCurrency(calc.total_interest)],
                  ['Total Repayment', formatCurrency(calc.total_repayment)],
                  ['End Date', formatDate(calc.end_date)],
                  ['Outstanding Balance', formatCurrency(loan.outstanding_balance)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                    <span style={{ width: '50%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{l}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: l === 'Total Repayment' ? 800 : 400, color: l === 'Total Repayment' ? 'var(--color-primary)' : undefined }}>{v}</span>
                  </div>
                ))}
                <div className="mt-4">
                  <button className="btn btn-outline btn-sm" onClick={() => loanService.calculate(id).then(() => { qc.invalidateQueries(['loan', id]); toast.success('Recalculated.'); })}>
                    <Calculator size={14} /> Recalculate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                <AlertTriangle size={36} style={{ color: 'var(--color-warning)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--color-gray-500)', marginBottom: '1rem' }}>Loan not yet calculated.</p>
                <button className="btn btn-primary btn-sm" onClick={() => loanService.calculate(id)}>
                  <Calculator size={14} /> Run Calculation
                </button>
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{loan.number_of_installments} installments</span>
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
                    <td>{row.due_date}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(row.payment)}</td>
                    <td>{formatCurrency(row.principal_paid)}</td>
                    <td>{formatCurrency(row.interest_charged)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(row.remaining_balance)}</td>
                    <td><span className={`badge ${row.status === 'PAID' ? 'badge-success' : row.status === 'OVERDUE' ? 'badge-danger' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
              {calc && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>TOTALS</strong></td>
                    <td><strong>{formatCurrency(calc.total_repayment)}</strong></td>
                    <td><strong>{formatCurrency(calc.principal)}</strong></td>
                    <td><strong>{formatCurrency(calc.total_interest)}</strong></td>
                    <td><strong>₹0.00</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Agreements Tab */}
      {activeTab === 'agreements' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              id="generate-agreement-btn"
              className="btn btn-gold"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || loan.status === 'DRAFT'}
              title={loan.status === 'DRAFT' ? 'Approve loan first' : ''}
            >
              {generateMutation.isPending ? <><span className="spinner" /> Generating...</> : <><FileText size={16} /> Generate Agreement</>}
            </button>
          </div>
          {loan.status === 'DRAFT' && (
            <div className="alert alert-warning mb-4">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              Approve the loan before generating an agreement.
            </div>
          )}
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Agreement #</th><th>Version</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {(!loan.agreements || loan.agreements?.length === 0) ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No agreements generated yet</td></tr>
                  ) : (loan.agreements || []).map(agr => (
                    <tr key={agr.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{agr.agreement_number}</td>
                      <td>v{agr.version_number}</td>
                      <td><span className={`badge ${agr.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>{agr.status}</span></td>
                      <td>{formatDate(agr.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={() => downloadAgreement(agr.id, 'pdf')} title="Download PDF">
                            <Download size={14} /> PDF
                          </button>
                          <button className="btn btn-gold btn-sm" onClick={() => downloadAgreement(agr.id, 'docx')} title="Download Editable DOCX">
                            <FileText size={14} /> DOCX
                          </button>
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
    </div>
  );
}
