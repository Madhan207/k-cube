import { useQuery } from '@tanstack/react-query';
import { borrowerService } from '../../services/api';
import { formatDate } from '../../utils/format';
import { User } from 'lucide-react';

export default function BorrowerProfile() {
  const { data: borrower, isLoading } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!borrower) return <div className="alert alert-danger">Borrower profile not found.</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">View your personal information and contact details</p>
      </div>

      <div className="card mb-6">
        <div className="card-header"><span style={{ fontWeight: 700 }}>Personal Information</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              ['Borrower ID', borrower.borrower_id],
              ['Full Name', borrower.full_name],
              ['Date of Birth', formatDate(borrower.date_of_birth)],
              ['Gender', borrower.gender],
              ['Father / Spouse Name', borrower.father_name || borrower.spouse_name || '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 600, marginBottom: '0.25rem' }}>{l}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span style={{ fontWeight: 700 }}>Contact & Address</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              ['Mobile Number', borrower.mobile],
              ['Email Address', borrower.email],
              ['Alternate Mobile', borrower.alternate_mobile || '—'],
              ['Address', borrower.full_address],
            ].map(([l, v]) => (
              <div key={l} style={{ padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 600, marginBottom: '0.25rem' }}>{l}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
