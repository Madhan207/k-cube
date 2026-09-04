import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP } from '../../utils/format';
import { Search, Plus, Eye, Filter } from 'lucide-react';

export default function AdminLoans() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['loans', search, statusFilter, page],
    queryFn: () => api.get('/loans/', {
      params: { search, status: statusFilter || undefined, page }
    }).then(r => r.data),
    staleTime: 30000,
  });

  const loans = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">{data?.count || 0} total loans</p>
        </div>
        <Link to="/admin/loans/create" className="btn btn-primary">
          <Plus size={16} /> Create Loan
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} className="search-bar-icon" />
              <input
                className="form-control"
                placeholder="Search by loan number, borrower name, ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.entries(LOAN_STATUS_MAP).map(([k, v]) => (
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
                  <th>Loan #</th>
                  <th>Borrower</th>
                  <th>Principal</th>
                  <th>Rate</th>
                  <th>Installments</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>No loans found</td></tr>
                ) : loans.map(loan => {
                  const s = LOAN_STATUS_MAP[loan.status] || { label: loan.status, cls: 'badge-gray' };
                  return (
                    <tr key={loan.id}>
                      <td><Link to={`/admin/loans/${loan.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{loan.loan_number}</Link></td>
                      <td>{loan.borrower_name}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(loan.principal_amount)}</td>
                      <td>{loan.interest_rate}%</td>
                      <td>{loan.number_of_installments} {loan.repayment_frequency.toLowerCase().replace('ly', 's')}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(loan.loan_start_date)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <Link to={`/admin/loans/${loan.id}`} className="btn btn-ghost btn-sm" title="View Details">
                          <Eye size={14} />
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
