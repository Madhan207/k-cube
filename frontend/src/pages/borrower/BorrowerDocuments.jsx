import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { documentService, borrowerService } from '../../services/api';
import { formatDate, downloadBlob } from '../../utils/format';
import { UploadCloud, FileText, Download, Lock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BorrowerDocuments() {
  const { data: borrower } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });

  const borrowerId = borrower?.id;

  const { data: kyc } = useQuery({
    queryKey: ['my-kyc'],
    queryFn: () => borrowerService.kycStatus(borrowerId).then(r => r.data),
    enabled: !!borrowerId,
  });

  const docs = kyc?.documents || [];

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="page-header">
        <h1 className="page-title">My Document Vault</h1>
        <p className="page-subtitle">Securely store, view, and manage your encrypted KYC and loan documents</p>
      </div>

      {/* Security Banner */}
      <div className="card mb-6" style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem' }}>
          <Lock size={28} style={{ color: '#eab308', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              🔒 Protected & Restricted Vault
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              Your documents (PAN, Aadhaar, Bank records) are protected with end-to-end access control. Only you and authorized compliance managers can view or download these files.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Uploaded Documents</span>
          <Link to="/dashboard/kyc" className="btn btn-primary btn-sm">
            <UploadCloud size={14} /> Upload / Manage KYC
          </Link>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>File Name</th>
                <th>Uploaded Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>
                    <FileText size={36} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                    No documents uploaded yet. Go to <Link to="/dashboard/kyc" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>KYC Verification</Link> to upload your PAN, Aadhaar, and Bank documents.
                  </td>
                </tr>
              ) : (
                docs.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                      {doc.document_type.replace('_', ' ')}
                    </td>
                    <td>{doc.file_name}</td>
                    <td>{formatDate(doc.upload_date)}</td>
                    <td>
                      <span className={`badge ${doc.verification_status === 'VERIFIED' ? 'badge-success' : 'badge-gray'}`}>
                        {doc.verification_status === 'VERIFIED' && <CheckCircle2 size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />}
                        {doc.verification_status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          documentService.download(doc.id).then(res => {
                            downloadBlob(res.data, doc.file_name);
                            toast.success('Document downloaded securely.');
                          }).catch(() => toast.error('Failed to download document. Access denied.'));
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
  );
}
