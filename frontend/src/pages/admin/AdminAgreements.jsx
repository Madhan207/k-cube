import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { agreementService } from '../../services/api';
import { formatDate, downloadBlob } from '../../utils/format';
import { Search, FileText, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAgreements() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['agreements', search, page],
    queryFn: () => agreementService.list({ search, page }).then(r => r.data),
    staleTime: 30000,
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
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agreements</h1>
        <p className="page-subtitle">Manage generated loan agreements</p>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div className="search-bar" style={{ maxWidth: 400 }}>
            <Search size={16} className="search-bar-icon" />
            <input
              className="form-control"
              placeholder="Search by agreement #, loan #, or borrower..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
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
                  <th>Loan #</th>
                  <th>Borrower</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {agreements.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No agreements found</td></tr>
                ) : agreements.map(agr => (
                  <tr key={agr.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{agr.agreement_number}</td>
                    <td><Link to={`/admin/loans/${agr.loan}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{agr.loan_number}</Link></td>
                    <td>{agr.borrower_name}</td>
                    <td>v{agr.version_number}</td>
                    <td><span className={`badge ${agr.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>{agr.status}</span></td>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(agr.created_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={() => downloadAgreement(agr.id, 'pdf')} title="Download PDF">
                          <Download size={14} /> PDF
                        </button>
                        <button className="btn btn-gold btn-sm" onClick={() => downloadAgreement(agr.id, 'docx')} title="Download Editable DOCX">
                          <FileText size={14} /> DOCX
                        </button>
                        <Link to={`/admin/loans/${agr.loan}`} className="btn btn-ghost btn-sm" title="View Loan"><Eye size={14} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginRight: '0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
