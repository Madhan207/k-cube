import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api, { borrowerService, loanService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';
import { Calculator, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly', defaultN: 25 },
  { value: 'MONTHLY', label: 'Monthly', defaultN: 12 },
  { value: 'FORTNIGHTLY', label: 'Fortnightly', defaultN: 24 },
];

export default function BorrowerApplyLoan() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reasonable defaults for borrower applications
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    principal_amount: '',
    interest_rate: '93.69', // Default Annual Rate (93.69% p.a.)
    interest_method: 'REDUCING_BALANCE',
    repayment_frequency: 'MONTHLY',
    number_of_installments: 12,
    loan_start_date: today,
    first_payment_date: '',
    purpose: '',
  });

  const { data: borrower, isLoading: bLoad } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });

  const applyMutation = useMutation({
    mutationFn: (data) => api.post('/loans/apply/', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['my-loans']);
      toast.success('Loan application submitted successfully!');
      navigate(`/dashboard/loans/${res.data.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit application.'),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFrequencyChange = (freq) => {
    const f = FREQUENCIES.find(f => f.value === freq);
    set('repayment_frequency', freq);
    set('number_of_installments', f?.defaultN || 12);
  };

  const handlePreview = async () => {
    if (!form.principal_amount || !form.first_payment_date) {
      toast.error('Please enter the principal amount and first payment date.'); return;
    }
    setPreviewLoading(true);
    try {
      const res = await loanService.preview({
        ...form,
        principal_amount: parseFloat(form.principal_amount),
        annual_interest_rate: parseFloat(form.interest_rate),
        number_of_installments: parseInt(form.number_of_installments),
      });
      setPreview(res.data);
      setStep(1);
    } catch (e) {
      toast.error('Calculation failed. Check inputs.');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (bLoad) return <div className="page-loader"><div className="spinner" /></div>;
  if (borrower?.kyc_status === 'REJECTED') {
    return (
      <div className="alert alert-danger" style={{ maxWidth: 600, margin: '2rem auto' }}>
        <h4>KYC Verification Rejected</h4>
        <p>Your KYC verification was rejected. Please re-submit your PAN, Aadhaar, or Bank documents before applying for a loan.</p>
        <Link to="/dashboard/kyc" className="btn btn-primary mt-4">Go to KYC Verification</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Apply for a Loan</h1>
        <p className="page-subtitle">Request a new loan seamlessly</p>
      </div>

      {borrower?.kyc_status !== 'VERIFIED' && (
        <div className="alert alert-warning mb-6">
          <strong>ℹ️ KYC Pending Verification:</strong> You can fill out and submit your loan application now. It will be reviewed by compliance managers upon approval.
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: '2rem' }}>
          
          {step === 0 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Loan Details</h3>
              <div className="form-group">
                <label className="form-label">How much would you like to borrow? (₹) <span className="required">*</span></label>
                <input className="form-control" type="number" style={{ fontSize: '1.5rem', padding: '1rem' }} placeholder="e.g. 100000" value={form.principal_amount} onChange={e => set('principal_amount', e.target.value)} />
              </div>
              <div className="form-grid form-grid-2 mt-4">
                <div className="form-group">
                  <label className="form-label">Repayment Frequency <span className="required">*</span></label>
                  <select className="form-control" value={form.repayment_frequency} onChange={e => handleFrequencyChange(e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Installments <span className="required">*</span></label>
                  <input className="form-control" type="number" min="1" max="120" value={form.number_of_installments} onChange={e => set('number_of_installments', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred First Payment Date <span className="required">*</span></label>
                <input className="form-control" type="date" min={today} value={form.first_payment_date} onChange={e => set('first_payment_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose of Loan</label>
                <input className="form-control" placeholder="e.g. Home Renovation, Education..." value={form.purpose} onChange={e => set('purpose', e.target.value)} />
              </div>
              
              <button className="btn btn-primary mt-4 w-full" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <span className="spinner" /> : <><Calculator size={18} /> Preview Loan Calculation</>}
              </button>
            </div>
          )}

          {step === 1 && preview && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>
                <Calculator size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Loan Calculation Preview
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Principal', value: formatCurrency(preview.principal) },
                  { label: 'Total Repayment', value: formatCurrency(preview.total_repayment) },
                  { label: 'Installment Amount', value: formatCurrency(preview.installment_amount) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '0.75rem', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="table-container" style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1.5rem' }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Due Date</th><th>Payment</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {(preview.amortization_schedule || []).map(row => (
                      <tr key={row.installment_no}>
                        <td>{row.installment_no}</td>
                        <td>{row.due_date}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.payment)}</td>
                        <td>{formatCurrency(row.remaining_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 justify-between">
                <button className="btn btn-ghost" onClick={() => setStep(0)}>Back to Edit</button>
                <button 
                  className="btn btn-gold" 
                  onClick={() => applyMutation.mutate({
                    ...form,
                    principal_amount: parseFloat(form.principal_amount),
                    annual_interest_rate: parseFloat(form.interest_rate),
                    number_of_installments: parseInt(form.number_of_installments),
                  })}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? <span className="spinner" /> : <><CheckCircle2 size={16} /> Submit Application</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
