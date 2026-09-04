import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { loanService, borrowerService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';
import { ArrowLeft, Calculator, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Select Borrower', 'Loan Details', 'Review & Calculate', 'Confirm'];
const FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly', defaultN: 25 },
  { value: 'MONTHLY', label: 'Monthly', defaultN: 25 },
  { value: 'FORTNIGHTLY', label: 'Fortnightly', defaultN: 25 },
];
const METHODS = [
  { value: 'REDUCING_BALANCE', label: 'Reducing Balance (EMI)' },
  { value: 'FLAT_RATE', label: 'Flat Rate (P × R × T)' },
];

export default function AdminCreateLoan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    principal_amount: '',
    interest_rate: '93.69',
    interest_method: 'REDUCING_BALANCE',
    repayment_frequency: 'WEEKLY',
    number_of_installments: 25,
    loan_start_date: today,
    first_payment_date: '',
    purpose: '',
    notes: '',
  });

  const { data: borrowerResults, isLoading: borrowerLoading } = useQuery({
    queryKey: ['borrower-search', borrowerSearch],
    queryFn: () => api.get('/borrowers/', { params: { search: borrowerSearch, page_size: 8 } }).then(r => r.data.results || []),
    enabled: borrowerSearch.length > 1,
  });

  const createMutation = useMutation({
    mutationFn: (data) => loanService.create(data),
    onSuccess: (res) => {
      toast.success(`Loan ${res.data.loan_number} created successfully!`);
      navigate(`/admin/loans/${res.data.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create loan.'),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFrequencyChange = (freq) => {
    const f = FREQUENCIES.find(f => f.value === freq);
    set('repayment_frequency', freq);
    set('number_of_installments', f?.defaultN || 25);
  };

  const handlePreview = async () => {
    if (!form.principal_amount || !form.interest_rate || !form.loan_start_date || !form.first_payment_date) {
      toast.error('Please fill all required loan details.'); return;
    }
    setPreviewLoading(true);
    try {
      const res = await loanService.preview({
        principal_amount: parseFloat(form.principal_amount),
        annual_interest_rate: parseFloat(form.interest_rate),
        number_of_installments: parseInt(form.number_of_installments),
        repayment_frequency: form.repayment_frequency,
        loan_start_date: form.loan_start_date,
        first_payment_date: form.first_payment_date,
        interest_method: form.interest_method,
      });
      setPreview(res.data);
      setStep(2);
    } catch (e) {
      toast.error('Calculation preview failed. Check your inputs.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedBorrower) { toast.error('No borrower selected.'); return; }
    createMutation.mutate({
      ...form,
      principal_amount: parseFloat(form.principal_amount),
      interest_rate: parseFloat(form.interest_rate),
      number_of_installments: parseInt(form.number_of_installments),
      borrower: selectedBorrower.id,
      kyc_exception_approved: selectedBorrower.kyc_status !== 'VERIFIED',
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/admin/loans" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="page-title">Create New Loan</h1>
          <p className="page-subtitle">Multi-step loan creation wizard</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="step-dot">{i < step ? <CheckCircle2 size={16} /> : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: '2rem' }}>

          {/* === STEP 0: Select Borrower === */}
          {step === 0 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Select Borrower</h3>
              <div className="form-group">
                <label className="form-label">Search Borrower</label>
                <input
                  className="form-control"
                  placeholder="Search by name, ID, mobile, PAN..."
                  value={borrowerSearch}
                  onChange={e => setBorrowerSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {borrowerLoading && <div className="flex items-center gap-2 mb-3"><div className="spinner" /><span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Searching...</span></div>}
              {(borrowerResults || []).length > 0 && (
                <div style={{ border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1rem' }}>
                  {borrowerResults.map(b => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBorrower(b)}
                      style={{
                        padding: '0.875rem 1.25rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-gray-100)',
                        background: selectedBorrower?.id === b.id ? 'var(--color-primary-50)' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>{b.full_name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{b.borrower_id} · {b.mobile} · {b.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${b.kyc_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>KYC: {b.kyc_status}</span>
                        {selectedBorrower?.id === b.id && <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedBorrower && (
                <div className="alert alert-success">
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Selected: {selectedBorrower.full_name}</div>
                    <div style={{ fontSize: '0.8125rem' }}>{selectedBorrower.borrower_id} · KYC: {selectedBorrower.kyc_status}</div>
                    {selectedBorrower.kyc_status !== 'VERIFIED' && (
                      <div style={{ marginTop: '0.25rem', color: 'var(--color-warning)', fontSize: '0.8125rem' }}>
                        ⚠ KYC not verified. An admin KYC exception will be required.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === STEP 1: Loan Details === */}
          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Loan Details</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Principal Amount (₹) <span className="required">*</span></label>
                  <input className="form-control" type="number" placeholder="e.g. 50000" min="1" value={form.principal_amount} onChange={e => set('principal_amount', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual Interest Rate (%) <span className="required">*</span></label>
                  <input className="form-control" type="number" placeholder="e.g. 93.69" step="0.01" min="0" max="500" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Interest Calculation Method <span className="required">*</span></label>
                  <select className="form-control" value={form.interest_method} onChange={e => set('interest_method', e.target.value)}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Repayment Frequency <span className="required">*</span></label>
                  <select className="form-control" value={form.repayment_frequency} onChange={e => handleFrequencyChange(e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Number of Installments <span className="required">*</span></label>
                  <input className="form-control" type="number" min="1" max="600" value={form.number_of_installments} onChange={e => set('number_of_installments', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Loan Start Date <span className="required">*</span></label>
                  <input className="form-control" type="date" value={form.loan_start_date} onChange={e => set('loan_start_date', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">First Payment Date <span className="required">*</span></label>
                <input className="form-control" type="date" value={form.first_payment_date} onChange={e => set('first_payment_date', e.target.value)} />
                <div className="form-hint">Must be after or on the loan start date</div>
              </div>
              <div className="form-group">
                <label className="form-label">Purpose of Loan</label>
                <input className="form-control" placeholder="e.g. Business expansion, Personal use..." value={form.purpose} onChange={e => set('purpose', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} placeholder="Internal notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          )}

          {/* === STEP 2: Calculation Preview === */}
          {step === 2 && preview && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>
                <Calculator size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Loan Calculation Preview
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Principal', value: formatCurrency(preview.principal) },
                  { label: 'Total Interest', value: formatCurrency(preview.total_interest) },
                  { label: 'Total Repayment', value: formatCurrency(preview.total_repayment) },
                  { label: 'Installment Amount', value: formatCurrency(preview.installment_amount) },
                  { label: 'Method', value: preview.interest_method?.replace('_', ' ') },
                  { label: 'End Date', value: formatDate(preview.end_date) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '0.75rem', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Amortization Preview (first 5 rows) */}
              <div className="table-container" style={{ maxHeight: 280, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Due Date</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {(preview.amortization_schedule || []).map(row => (
                      <tr key={row.installment_no}>
                        <td>{row.installment_no}</td>
                        <td>{row.due_date}</td>
                        <td>{formatCurrency(row.payment)}</td>
                        <td>{formatCurrency(row.principal_paid)}</td>
                        <td>{formatCurrency(row.interest_charged)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.remaining_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === STEP 3: Confirm === */}
          {step === 3 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Confirm Loan Creation</h3>
              <div className="alert alert-info mb-4">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <div>You are about to create a loan for <strong>{selectedBorrower?.full_name}</strong>. The payment schedule will be generated automatically.</div>
              </div>
              {preview && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    ['Borrower', selectedBorrower?.full_name],
                    ['Borrower ID', selectedBorrower?.borrower_id],
                    ['Principal', formatCurrency(preview.principal)],
                    ['Interest Rate', `${form.interest_rate}% p.a.`],
                    ['Method', form.interest_method.replace('_', ' ')],
                    ['Frequency', form.repayment_frequency],
                    ['Installments', form.number_of_installments],
                    ['Installment Amount', formatCurrency(preview.installment_amount)],
                    ['Total Interest', formatCurrency(preview.total_interest)],
                    ['Total Repayment', formatCurrency(preview.total_repayment)],
                    ['Start Date', formatDate(form.loan_start_date)],
                    ['End Date', formatDate(preview.end_date)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <span style={{ fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/loans')} disabled={createMutation.isPending}>
            <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 0 && (
              <button className="btn btn-primary" onClick={() => { if (!selectedBorrower) { toast.error('Select a borrower first.'); return; } setStep(1); }} disabled={!selectedBorrower}>
                Next <ChevronRight size={16} />
              </button>
            )}
            {step === 1 && (
              <button className="btn btn-primary" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <><span className="spinner" /> Calculating...</> : <><Calculator size={16} /> Calculate & Preview</>}
              </button>
            )}
            {step === 2 && (
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Continue to Confirm <ChevronRight size={16} />
              </button>
            )}
            {step === 3 && (
              <button
                id="create-loan-submit"
                className="btn btn-gold"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <><span className="spinner" /> Creating...</> : <><CheckCircle2 size={16} /> Create Loan</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
