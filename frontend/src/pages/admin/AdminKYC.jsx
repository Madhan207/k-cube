import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { kycService } from '../../services/api';
import { formatDate, KYC_STATUS_MAP } from '../../utils/format';
import { Search, Eye, Filter } from 'lucide-react';

export default function AdminKYC() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['kyc', search, statusFilter, page],
    queryFn: () => kycService.listAll({ search, overall_status: statusFilter || undefined, page }).then(r => r.data),
    staleTime: 30000,
  });

  const profiles = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">KYC Management</h1>
        <p className="page-subtitle">Review and verify borrower KYC profiles</p>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} className="search-bar-icon" />
              <input
                className="form-control"
                placeholder="Search by borrower name, ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="form-control" style={{ width: 200 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {Object.entries(KYC_STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
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
                  <th>Borrower</th>
                  <th>Mobile Verified</th>
                  <th>PAN Status</th>
                  <th>Aadhaar Status</th>
                  <th>Overall Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No profiles found</td></tr>
                ) : profiles.map(p => {
                  const oStatus = KYC_STATUS_MAP[p.overall_status] || { label: p.overall_status, cls: 'badge-gray' };
                  const pStatus = KYC_STATUS_MAP[p.pan_status] || { label: p.pan_status, cls: 'badge-gray' };
                  const aStatus = KYC_STATUS_MAP[p.aadhaar_status] || { label: p.aadhaar_status, cls: 'badge-gray' };
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/admin/borrowers/${p.borrower_id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {p.borrower_name}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{p.borrower_id}</div>
                      </td>
                      <td><span className={`badge ${p.mobile_verified ? 'badge-success' : 'badge-gray'}`}>{p.mobile_verified ? 'Yes' : 'No'}</span></td>
                      <td><span className={`badge ${pStatus.cls}`}>{pStatus.label}</span></td>
                      <td><span className={`badge ${aStatus.cls}`}>{aStatus.label}</span></td>
                      <td><span className={`badge ${oStatus.cls}`}>{oStatus.label}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(p.last_updated)}</td>
                      <td>
                        <Link to={`/admin/borrowers/${p.borrower_id}`} className="btn btn-ghost btn-sm" title="Review">
                          <Eye size={14} /> Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
