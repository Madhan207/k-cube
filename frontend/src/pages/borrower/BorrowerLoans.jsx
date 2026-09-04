import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { borrowerService } from '../../services/api';
import { formatCurrency, formatDate, LOAN_STATUS_MAP } from '../../utils/format';
import { Eye, PlusCircle } from 'lucide-react';

export default function BorrowerLoans() {
  const { data: borrower } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });
  
  const borrowerId = borrower?.id;
  
  const { data: loans, isLoading } = useQuery({
    queryKey: ['my-loans'],
    queryFn: () => borrowerService.loans(borrowerId).then(r => r.data),
    enabled: !!borrowerId,
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">My Loans</h1>
          <p className="page-subtitle">View and track your loan applications and active loans</p>
        </div>
        <Link to="/dashboard/apply" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} /> Apply for New Loan
        </Link>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="page-loader"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-container" style={{ borderRadius: 'var(--radius-xl)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Loan Name / #</th>
                  <th>Principal Amount</th>
                  <th>Interest Rate</th>
                  <th>Repayment</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!loans || loans.length === 0) ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-gray-500)' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>No loans found</p>
                      <Link to="/dashboard/apply" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PlusCircle size={15} /> Apply for your first loan
                      </Link>
                    </td>
                  </tr>
                ) : loans.map(loan => {
                  const s = LOAN_STATUS_MAP[loan.status] || { label: loan.status, cls: 'badge-gray' };
                  const displayName = borrower?.full_name || loan.borrower_name || 'Loan Application';
                  return (
                    <tr key={loan.id}>
                      <td>
                        <Link to={`/dashboard/loans/${loan.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>{displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontFamily: 'monospace', fontWeight: 600 }}>{loan.loan_number}</div>
                        </Link>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(loan.principal_amount)}</td>
                      <td>{loan.interest_rate}%</td>
                      <td>{loan.number_of_installments} {loan.repayment_frequency.toLowerCase()}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(loan.loan_start_date)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <Link to={`/dashboard/loans/${loan.id}`} className="btn btn-ghost btn-sm" title="View Details">
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
