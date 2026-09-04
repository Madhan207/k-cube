import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, UserPlus, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'Address', 'Account Setup', 'Confirm'];

export default function AdminCreateBorrower() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'MALE',
    father_name: '',
    mother_name: '',
    spouse_name: '',
    pan_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    state: '',
    pin_code: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    password: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/borrowers/', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['borrowers']);
      toast.success(`Borrower created successfully!`);
      const targetId = res.data?.id || res.data?.borrower_id;
      if (targetId) {
        navigate(`/admin/borrowers/${targetId}`);
      } else {
        navigate('/admin/borrowers');
      }
    },
    onError: (err) => toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create borrower.'),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    createMutation.mutate(form);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/admin/borrowers" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="page-title">Create Borrower</h1>
          <p className="page-subtitle">Multi-step borrower registration</p>
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

          {/* === STEP 0: Personal Info === */}
          {step === 0 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Personal Information</h3>
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-control" placeholder="e.g. John Doe" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Date of Birth <span className="required">*</span></label>
                  <input className="form-control" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender <span className="required">*</span></label>
                  <select className="form-control" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Father's Name</label>
                  <input className="form-control" value={form.father_name} onChange={e => set('father_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mother's Name</label>
                  <input className="form-control" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} />
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Spouse Name</label>
                  <input className="form-control" value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input className="form-control" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>
          )}

          {/* === STEP 1: Address === */}
          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Address Details</h3>
              <div className="form-group">
                <label className="form-label">Address Line 1 <span className="required">*</span></label>
                <input className="form-control" placeholder="Door No, Street Name" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input className="form-control" placeholder="Village / Area / Landmark" value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">City / Town <span className="required">*</span></label>
                  <input className="form-control" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">District <span className="required">*</span></label>
                  <input className="form-control" value={form.district} onChange={e => set('district', e.target.value)} />
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">State <span className="required">*</span></label>
                  <input className="form-control" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code <span className="required">*</span></label>
                  <input className="form-control" value={form.pin_code} onChange={e => set('pin_code', e.target.value)} maxLength={6} />
                </div>
              </div>
            </div>
          )}

          {/* === STEP 2: Account Setup === */}
          {step === 2 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Account Setup & Contact</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address <span className="required">*</span></label>
                  <input className="form-control" type="email" placeholder="borrower@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password <span className="required">*</span></label>
                  <input className="form-control" type="password" placeholder="At least 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Mobile Number <span className="required">*</span></label>
                  <input className="form-control" placeholder="e.g. 9876543210" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alternate Mobile</label>
                  <input className="form-control" value={form.alternate_mobile} onChange={e => set('alternate_mobile', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea className="form-control" rows={3} placeholder="Internal notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          )}

          {/* === STEP 3: Confirm === */}
          {step === 3 && (
            <div className="fade-in">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Confirm Details</h3>
              <div className="alert alert-info mb-4">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <div>You are about to create a borrower account for <strong>{form.full_name}</strong>. They will be able to log in with the provided email and password.</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  ['Full Name', form.full_name],
                  ['Email', form.email],
                  ['Mobile', form.mobile],
                  ['DOB', form.date_of_birth],
                  ['PAN', form.pan_number || 'N/A'],
                  ['City', form.city],
                  ['State', form.state],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                    <span style={{ fontSize: '0.8375rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/borrowers')} disabled={createMutation.isPending}>
            <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step < 3 && (
              <button className="btn btn-primary" onClick={() => {
                if (step === 0 && (!form.full_name || !form.date_of_birth || !form.gender)) {
                  toast.error('Please fill required personal info.'); return;
                }
                if (step === 1 && (!form.address_line1 || !form.city || !form.district || !form.state || !form.pin_code)) {
                  toast.error('Please fill required address fields.'); return;
                }
                if (step === 2 && (!form.email || !form.password || !form.mobile)) {
                  toast.error('Please fill email, mobile, and password.'); return;
                }
                setStep(s => s + 1);
              }}>
                Next <ChevronRight size={16} />
              </button>
            )}
            {step === 3 && (
              <button
                className="btn btn-gold"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <><span className="spinner" /> Creating...</> : <><UserPlus size={16} /> Create Borrower</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
