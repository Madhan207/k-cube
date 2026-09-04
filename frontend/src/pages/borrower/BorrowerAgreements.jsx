import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { agreementService } from '../../services/api';
import { formatDate, downloadBlob } from '../../utils/format';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BorrowerAgreements() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-agreements', page],
    queryFn: () => agreementService.list({ page }).then(r => r.data),
  });

  const downloadAgreement = async (id, format) => {
    try {
      const fn = format === 'pdf' ? agreementService.downloadPDF : agreementService.downloadDOCX;
      const res = await fn(id);
      downloadBlob(res.data, `agreement-${id}.${format}`);
      toast.success(`${format.toUpperCase()} downloaded.`);
    } catch { toast.error(`Failed to download ${format.toUpperCase()}.`); }
  };

  const agreements = data?.results || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Agreements</h1>
        <p className="page-subtitle">Download your generated loan agreements</p>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="page-loader"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-container" style={{ borderRadius: 'var(--radius-xl)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Agreement #</th>
                  <th>Loan Name / #</th>
                  <th>Version</th>
                  <th>Generated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No agreements found</td></tr>
                ) : agreements.map(agr => (
                  <tr key={agr.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{agr.agreement_number}</td>
                    <td>
                      <Link to={`/dashboard/loans/${agr.loan}`} style={{ textDecoration: 'none' }}>
                        {agr.borrower_name && <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{agr.borrower_name}</div>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontFamily: 'monospace', fontWeight: 600 }}>{agr.loan_number}</div>
                      </Link>
                    </td>
                    <td>v{agr.version_number}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(agr.created_at)}</td>
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
        )}
      </div>
    </div>
  );
}
