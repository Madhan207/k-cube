import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { borrowerService } from '../../services/api';
import { KYC_STATUS_MAP, formatDate } from '../../utils/format';
import { Search, Plus, Eye, UserX, UserCheck, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBorrowers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['borrowers', search, statusFilter, kycFilter, page],
    queryFn: () => api.get('/borrowers/', {
      params: { search, status: statusFilter || undefined, page }
    }).then(r => r.data),
    staleTime: 30000,
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => borrowerService.suspend(id),
    onSuccess: () => { qc.invalidateQueries(['borrowers']); toast.success('Borrower suspended.'); },
    onError: () => toast.error('Failed to suspend borrower.'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id) => borrowerService.reactivate(id),
    onSuccess: () => { qc.invalidateQueries(['borrowers']); toast.success('Borrower reactivated.'); },
    onError: () => toast.error('Failed to reactivate.'),
  });

  const borrowers = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Borrowers</h1>
          <p className="page-subtitle">{data?.count || 0} total borrowers</p>
        </div>
        <Link to="/admin/borrowers/create" className="btn btn-primary">
          <Plus size={16} /> Add Borrower
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} className="search-bar-icon" />
              <input
                id="borrower-search"
                className="form-control"
                placeholder="Search by name, ID, mobile, email, PAN..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading borrowers...</span></div>
        ) : (
          <div className="table-container" style={{ borderRadius: 'var(--radius-xl)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Borrower ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>PAN</th>
                  <th>KYC Status</th>
                  <th>Account Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No borrowers found</td></tr>
                ) : borrowers.map(b => {
                  const kyc = KYC_STATUS_MAP[b.kyc_status] || { label: b.kyc_status, cls: 'badge-gray' };
                  return (
                    <tr key={b.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{b.borrower_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.full_name}</td>
                      <td>{b.mobile}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{b.email}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{b.masked_pan || '—'}</span></td>
                      <td><span className={`badge ${kyc.cls}`}>{kyc.label}</span></td>
                      <td>
                        <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : b.status === 'SUSPENDED' ? 'badge-danger' : 'badge-gray'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(b.created_at)}</td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/admin/borrowers/${b.id}`} className="btn btn-ghost btn-sm" title="View">
                            <Eye size={14} />
                          </Link>
                          {b.status === 'ACTIVE' ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Suspend"
                              onClick={() => { if (window.confirm(`Suspend ${b.full_name}?`)) suspendMutation.mutate(b.id); }}
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Reactivate"
                              onClick={() => reactivateMutation.mutate(b.id)}
                              style={{ color: 'var(--color-success)' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
