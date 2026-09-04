import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, tokenStorage } from '../../services/api';
import { Eye, EyeOff, UserPlus, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'Contact & Address', 'Account Setup'];

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh',
  'Puducherry','Chandigarh','Andaman and Nicobar Islands','Lakshadweep',
  'Dadra and Nagar Haveli and Daman and Diu',
];

const F = ({ label, id, children, error, required: req, hint }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={id}>{label}{req && <span className="required">*</span>}</label>
    {children}
    {error && <div className="form-error">{error}</div>}
    {hint && !error && <div className="form-hint">{hint}</div>}
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', gender: '', father_name: '',
    mobile: '', alternate_mobile: '', email: '',
    address_line1: '', address_line2: '', city: '', district: '', state: 'Tamil Nadu', pin_code: '',
    password: '', password_confirm: '',
  });

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.full_name.trim()) errs.full_name = 'Full name is required';
      if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required';
      if (!form.gender) errs.gender = 'Gender is required';
    }
    if (step === 1) {
      if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
      if (!form.address_line1.trim()) errs.address_line1 = 'Address is required';
      if (!form.city.trim()) errs.city = 'City is required';
      if (!form.district.trim()) errs.district = 'District is required';
      if (!form.pin_code || !/^\d{6}$/.test(form.pin_code)) errs.pin_code = 'Enter a valid 6-digit PIN code';
    }
    if (step === 2) {
      if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
      if (form.password !== form.password_confirm) errs.password_confirm = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 2) {
      if (!validateStep()) return;
      setLoading(true);
      try {
        const response = await authService.register(form);
        toast.success('Registration successful! Welcome to K-CUBE.');
        if (response.data.access && response.data.refresh) {
          tokenStorage.setTokens(response.data.access, response.data.refresh);
        }
        window.location.href = '/dashboard';
      } catch (err) {
        const data = err.response?.data || {};
        const firstError = Object.values(data)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : (firstError || 'Registration failed. Please try again.'));
        setErrors(data);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link to="/"><div style={{ width: 52, height: 52, background: 'var(--color-gold)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontWeight: 900, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>KC</div></Link>
          <h1 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem' }}>Create Account</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Register with K-CUBE Audit & FinServ</p>
        </div>

        <div className="card" style={{ borderRadius: '1.25rem' }}>
          <div className="card-body" style={{ padding: '1.75rem' }}>
            {/* Step Indicator */}
            <div className="step-indicator mb-6">
              {STEPS.map((label, i) => (
                <div key={label} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="step-dot">
                    {i < step ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <div className="step-label">{label}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {/* === STEP 0: Personal Info === */}
              {step === 0 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Personal Information</h3>
                  <F label="Full Name" id="full_name" required error={errors.full_name}>
                    <input id="full_name" className={`form-control ${errors.full_name ? 'error' : ''}`} placeholder="As per official documents" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                  </F>
                  <div className="form-grid form-grid-2">
                    <F label="Date of Birth" id="date_of_birth" required error={errors.date_of_birth}>
                      <input id="date_of_birth" type="date" className={`form-control ${errors.date_of_birth ? 'error' : ''}`} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                    </F>
                    <F label="Gender" id="gender" required error={errors.gender}>
                      <select id="gender" className={`form-control ${errors.gender ? 'error' : ''}`} value={form.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </F>
                  </div>
                  <F label="Father's / Mother's / Spouse Name" id="father_name">
                    <input id="father_name" className="form-control" placeholder="Optional" value={form.father_name} onChange={e => set('father_name', e.target.value)} />
                  </F>
                </div>
              )}

              {/* === STEP 1: Contact & Address === */}
              {step === 1 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Contact & Address</h3>
                  <div className="form-grid form-grid-2">
                    <F label="Mobile Number" id="mobile" required error={errors.mobile} hint="10-digit Indian mobile number">
                      <input id="mobile" className={`form-control ${errors.mobile ? 'error' : ''}`} placeholder="9XXXXXXXXX" maxLength={10} value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} />
                    </F>
                    <F label="Alternate Mobile" id="alternate_mobile">
                      <input id="alternate_mobile" className="form-control" placeholder="Optional" maxLength={10} value={form.alternate_mobile} onChange={e => set('alternate_mobile', e.target.value.replace(/\D/g, ''))} />
                    </F>
                  </div>
                  <F label="Email Address" id="email" required error={errors.email}>
                    <input id="email" type="email" className={`form-control ${errors.email ? 'error' : ''}`} placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </F>
                  <F label="Address Line 1" id="address_line1" required error={errors.address_line1}>
                    <input id="address_line1" className={`form-control ${errors.address_line1 ? 'error' : ''}`} placeholder="Door No, Street, Area" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
                  </F>
                  <F label="Address Line 2" id="address_line2">
                    <input id="address_line2" className="form-control" placeholder="Landmark, Colony (optional)" value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
                  </F>
                  <div className="form-grid form-grid-3">
                    <F label="City" id="city" required error={errors.city}>
                      <input id="city" className={`form-control ${errors.city ? 'error' : ''}`} value={form.city} onChange={e => set('city', e.target.value)} />
                    </F>
                    <F label="District" id="district" required error={errors.district}>
                      <input id="district" className={`form-control ${errors.district ? 'error' : ''}`} value={form.district} onChange={e => set('district', e.target.value)} />
                    </F>
                    <F label="PIN Code" id="pin_code" required error={errors.pin_code}>
                      <input id="pin_code" className={`form-control ${errors.pin_code ? 'error' : ''}`} maxLength={6} value={form.pin_code} onChange={e => set('pin_code', e.target.value.replace(/\D/g, ''))} />
                    </F>
                  </div>
                  <F label="State" id="state" required>
                    <select id="state" className="form-control" value={form.state} onChange={e => set('state', e.target.value)}>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </F>
                </div>
              )}

              {/* === STEP 2: Account Setup === */}
              {step === 2 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1.25rem' }}>Account Setup</h3>
                  <F label="Password" id="password" required error={errors.password} hint="Minimum 8 characters with letters and numbers">
                    <div style={{ position: 'relative' }}>
                      <input id="password" type={showPwd ? 'text' : 'password'} className={`form-control ${errors.password ? 'error' : ''}`} placeholder="Create a strong password" value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: '2.75rem' }} />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </F>
                  <F label="Confirm Password" id="password_confirm" required error={errors.password_confirm}>
                    <input id="password_confirm" type="password" className={`form-control ${errors.password_confirm ? 'error' : ''}`} placeholder="Re-enter your password" value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)} />
                  </F>
                  <div className="alert alert-info mt-4" style={{ fontSize: '0.8375rem' }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <div>After registration, you will need to complete KYC verification (PAN + Aadhaar/e-KYC) before a loan agreement can be generated.</div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6" style={{ gap: '0.75rem' }}>
                {step > 0 ? (
                  <button type="button" className="btn btn-ghost" onClick={handleBack}>
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : <div />}
                
                {step < 2 ? (
                  <button type="button" id={`next-step-${step}`} className="btn btn-primary" onClick={handleNext}>
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button id="register-submit" type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <span className="spinner" /> : <UserPlus size={17} />}
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                )}
              </div>
            </form>
          </div>
          <div className="card-footer" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
