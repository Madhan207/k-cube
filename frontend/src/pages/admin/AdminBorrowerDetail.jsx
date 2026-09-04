import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { borrowerService, kycService, loanService, agreementService } from '../../services/api';
import { formatCurrency, formatDate, KYC_STATUS_MAP, LOAN_STATUS_MAP, downloadBlob } from '../../utils/format';
import {
  User, ShieldCheck, CreditCard, FileText, ArrowLeft,
  CheckCircle2, XCircle, Download, Eye, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBorrowerDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: borrower, isLoading } = useQuery({
    queryKey: ['borrower', id],
    queryFn: () => borrowerService.get(id).then(r => r.data),
  });

  const { data: kycProfile } = useQuery({
    queryKey: ['kyc', borrower?.borrower_id],
    queryFn: () => kycService.profile(borrower.borrower_id).then(r => r.data),
    enabled: !!borrower?.borrower_id,
  });

  const { data: loans } = useQuery({
    queryKey: ['borrower-loans', id],
    queryFn: () => borrowerService.loans(id).then(r => r.data),
    enabled: !!id,
  });

  const kycActionMutation = useMutation({
    mutationFn: ({ action, notes }) => kycService.adminAction(borrower.borrower_id, { action, notes }),
    onSuccess: () => { qc.invalidateQueries(['kyc']); toast.success('KYC action applied.'); },
    onError: () => toast.error('KYC action failed.'),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!borrower) return <div className="alert alert-danger">Borrower not found.</div>;

  const kyc = KYC_STATUS_MAP[borrower.kyc_status] || { label: borrower.kyc_status, cls: 'badge-gray' };
  const tabs = ['profile', 'kyc', 'loans', 'documents'];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/admin/borrowers" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{borrower.full_name}</h1>
          <p className="page-subtitle">{borrower.borrower_id} · {borrower.email}</p>
        </div>
        <span className={`badge ${kyc.cls}`} style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem' }}>
          KYC: {kyc.label}
        </span>
        <span className={`badge ${borrower.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.875rem' }}>
          {borrower.status}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-gray-200)', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '0.625rem 1.25rem',
              border: 'none', background: 'none',
              fontWeight: 600, fontSize: '0.875rem',
              color: activeTab === t ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: activeTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px', cursor: 'pointer', textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {t === 'kyc' ? 'KYC' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="fade-in">
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 700 }}>Personal & Contact Details</span></div>
            <div className="card-body">
              {[
                ['Borrower ID', borrower.borrower_id],
                ['Full Name', borrower.full_name],
                ['Date of Birth', formatDate(borrower.date_of_birth)],
                ['Gender', borrower.gender],
                ['Father / Spouse Name', borrower.father_name || borrower.spouse_name || '—'],
                ['Mobile Number', borrower.mobile],
                ['Alternate Mobile', borrower.alternate_mobile || '—'],
                ['Email Address', borrower.email],
                ['Residential Address', borrower.full_address || `${borrower.address_line1}, ${borrower.city}, ${borrower.state} - ${borrower.pin_code}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <span style={{ width: '45%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-gray-800)', fontWeight: label === 'Borrower ID' ? 700 : 400 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 700 }}>KYC & Banking Information</span></div>
            <div className="card-body">
              {[
                ['PAN Number', borrower.masked_pan || '—'],
                ['PAN Status', borrower.pan_verified ? '✓ Verified' : 'Pending Verification'],
                ['Aadhaar Number', borrower.masked_aadhaar || '—'],
                ['Aadhaar Status', borrower.aadhaar_verified ? '✓ Verified' : 'Pending e-KYC'],
                ['Bank Name', kycProfile?.bank_account?.bank_name || '—'],
                ['Account Number', kycProfile?.bank_account?.account_number || kycProfile?.bank_account?.masked_account_number || '—'],
                ['IFSC Code', kycProfile?.bank_account?.ifsc_code || '—'],
                ['Branch Name', kycProfile?.bank_account?.branch_name || '—'],
                ['Account Type', kycProfile?.bank_account?.account_type || 'Savings'],
                ['Overall KYC Status', borrower.kyc_status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <span style={{ width: '45%', fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-gray-800)', fontWeight: label === 'Overall KYC Status' ? 700 : 400 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="fade-in">
          <div className="card mb-4">
            <div className="card-header">
              <span style={{ fontWeight: 700 }}>KYC Status</span>
              <span className={`badge ${KYC_STATUS_MAP[kycProfile?.overall_status]?.cls || 'badge-gray'}`}>
                {KYC_STATUS_MAP[kycProfile?.overall_status]?.label || 'Not Started'}
              </span>
            </div>
            <div className="card-body">
              <div className="kyc-status-grid mb-4">
                {[
                  { label: 'Mobile Verification', key: 'mobile_verified', isBoolean: true },
                  { label: 'PAN Verification', key: 'pan_status', choices: KYC_STATUS_MAP },
                  { label: 'Aadhaar / e-KYC', key: 'aadhaar_status', choices: KYC_STATUS_MAP },
                  { label: 'Address Status', key: 'address_status', choices: KYC_STATUS_MAP },
                ].map(({ label, key, isBoolean, choices }) => {
                  const val = kycProfile?.[key];
                  const status = isBoolean ? (val ? 'VERIFIED' : 'NOT_STARTED') : (val || 'NOT_STARTED');
                  const map = KYC_STATUS_MAP[status] || { label: status, cls: 'badge-gray' };
                  return (
                    <div key={key} className={`kyc-status-row ${status === 'VERIFIED' ? 'verified' : status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</span>
                      <span className={`badge ${map.cls}`}>{map.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => kycActionMutation.mutate({ action: 'approve', notes: 'Admin approved' })}
                >
                  <CheckCircle2 size={14} /> Approve KYC
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { const notes = prompt('Rejection reason:'); if (notes) kycActionMutation.mutate({ action: 'reject', notes }); }}
                >
                  <XCircle size={14} /> Reject KYC
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => kycActionMutation.mutate({ action: 'request_info', notes: 'Additional documents required' })}
                >
                  Request Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link to={`/admin/loans/create?borrower=${borrower.borrower_id}`} className="btn btn-primary btn-sm">
              <Plus size={14} /> Create Loan
            </Link>
          </div>
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Loan #</th>
                    <th>Principal</th>
                    <th>Rate</th>
                    <th>Frequency</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(!loans || loans.length === 0) ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No loans for this borrower</td></tr>
                  ) : (Array.isArray(loans) ? loans : []).map(loan => {
                    const s = LOAN_STATUS_MAP[loan.status] || { label: loan.status, cls: 'badge-gray' };
                    return (
                      <tr key={loan.id}>
                        <td><Link to={`/admin/loans/${loan.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{loan.loan_number}</Link></td>
                        <td>{formatCurrency(loan.principal_amount)}</td>
                        <td>{loan.interest_rate}%</td>
                        <td>{loan.repayment_frequency}</td>
                        <td>{formatDate(loan.loan_start_date)}</td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                        <td><Link to={`/admin/loans/${loan.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="fade-in">
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700 }}>KYC & Uploaded Documents</span>
              <span className="badge badge-gold">🔒 Encrypted Storage</span>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Uploaded Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(!kycProfile?.documents || kycProfile.documents.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>
                        <FileText size={36} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                        No documents uploaded yet for this borrower.
                      </td>
                    </tr>
                  ) : (
                    kycProfile.documents.map(doc => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                          {doc.document_type.replace('_', ' ')}
                        </td>
                        <td>{doc.file_name}</td>
                        <td>{(doc.file_size / 1024).toFixed(1)} KB</td>
                        <td>{formatDate(doc.upload_date)}</td>
                        <td>
                          <span className={`badge ${doc.verification_status === 'VERIFIED' ? 'badge-success' : 'badge-gray'}`}>
                            {doc.verification_status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Download / View Secure Document"
                            onClick={() => {
                              documentService.download(doc.id).then(res => {
                                downloadBlob(res.data, doc.file_name);
                                toast.success('Document downloaded securely.');
                              }).catch(() => toast.error('Failed to view document. Access denied.'));
                            }}
                          >
                            <Download size={14} /> Download
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
