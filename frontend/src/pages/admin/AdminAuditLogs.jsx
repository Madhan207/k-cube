import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDate } from '../../utils/format';
import { Search } from 'lucide-react';

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search, page],
    queryFn: () => api.get('/audit-logs/', { params: { search, page } }).then(r => r.data),
    staleTime: 30000,
  });

  const logs = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">System-wide immutable action history</p>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div className="search-bar" style={{ maxWidth: 400 }}>
            <Search size={16} className="search-bar-icon" />
            <input
              className="form-control"
              placeholder="Search by action, user email, target ID..."
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
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No audit logs found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(log.timestamp, { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="badge badge-primary">{log.action}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.actor_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{log.actor_email}</div>
                    </td>
                    <td>{log.target_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{log.target_id}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{log.ip_address || '—'}</td>
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
