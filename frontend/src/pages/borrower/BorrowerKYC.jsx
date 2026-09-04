import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { borrowerService, kycService } from '../../services/api';
import { KYC_STATUS_MAP } from '../../utils/format';
import { ShieldCheck, CheckCircle2, Upload, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function BorrowerKYC() {
  const qc = useQueryClient();
  const [pan, setPan] = useState('');
  const [panFrontFile, setPanFrontFile] = useState(null);
  const [panBackFile, setPanBackFile] = useState(null);

  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);
  const [aadhaarConsent, setAadhaarConsent] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [txnInfo, setTxnInfo] = useState({ transactionId: '', verificationId: '' });

  const [bankForm, setBankForm] = useState({
    account_holder_name: '', bank_name: '', branch_name: '',
    account_number: '', ifsc_code: '', account_type: 'SAVINGS'
  });
  const [bankStatementFile, setBankStatementFile] = useState(null);
  const [passbookFile, setPassbookFile] = useState(null);

  const { data: borrower, isLoading: bLoad } = useQuery({
    queryKey: ['my-borrower'],
    queryFn: () => borrowerService.list().then(r => r.data.results?.[0] || null),
  });

  const borrowerId = borrower?.id;
  const bid = borrower?.borrower_id;

  const { data: kyc, isLoading: kLoad } = useQuery({
    queryKey: ['my-kyc'],
    queryFn: () => borrowerService.kycStatus(borrowerId).then(r => r.data),
    enabled: !!borrowerId,
  });

  useEffect(() => {
    if (kyc?.bank_account) {
      setBankForm(prev => ({ ...prev, ...kyc.bank_account }));
    }
  }, [kyc]);

  // Document upload helper
  const uploadDoc = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);
    formData.append('borrower_id', bid);
    return api.post('/documents/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
  };

  // PAN Verification Mutation
  const panMutation = useMutation({
    mutationFn: async () => {
      if (panFrontFile) await uploadDoc(panFrontFile, 'PAN_FRONT');
      if (panBackFile) await uploadDoc(panBackFile, 'PAN_BACK');
      
      return kycService.verifyPan({ borrower_id: bid, pan_number: pan.toUpperCase() });
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-kyc']);
      qc.invalidateQueries(['my-borrower']);
      toast.success('PAN Verified successfully!');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'PAN Verification failed. Ensure Front & Back images are uploaded.');
    }
  });

  // Aadhaar OTP Initiate Mutation
  const aadhaarInitiateMutation = useMutation({
    mutationFn: async () => {
      if (aadhaarFrontFile) await uploadDoc(aadhaarFrontFile, 'AADHAAR_FRONT');
      if (aadhaarBackFile) await uploadDoc(aadhaarBackFile, 'AADHAAR_BACK');

      return kycService.initiateAadhaar({
        borrower_id: bid,
        aadhaar_number: aadhaar,
        consent: aadhaarConsent
      });
    },
    onSuccess: (res) => {
      setOtpSent(true);
      setTxnInfo({
        transactionId: res.data.transaction_id,
        verificationId: res.data.verification_id
      });
      toast.success('OTP sent to your registered mobile number!');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Aadhaar verification failed. Ensure Front & Back images are uploaded.');
    }
  });

  // Aadhaar OTP Verify Mutation
  const aadhaarOtpMutation = useMutation({
    mutationFn: async () => {
      return kycService.verifyAadhaarOTP({
        verification_id: txnInfo.verificationId,
        transaction_id: txnInfo.transactionId,
        otp: otp
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-kyc']);
      qc.invalidateQueries(['my-borrower']);
      toast.success('Aadhaar Verified successfully!');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || 'Invalid OTP. Please try again.');
    }
  });

  const bankMutation = useMutation({
    mutationFn: (data) => api.post(`/kyc/${bid}/bank-account/`, data),
    onSuccess: () => { qc.invalidateQueries(['my-kyc']); toast.success('Bank account details saved!'); },
    onError: () => toast.error('Failed to save bank details.')
  });

  const bankDocsMutation = useMutation({
    mutationFn: async () => {
      if (bankStatementFile) await uploadDoc(bankStatementFile, 'BANK_STATEMENT');
      if (passbookFile) await uploadDoc(passbookFile, 'BANK_PASSBOOK');
    },
    onSuccess: () => { qc.invalidateQueries(['my-kyc']); toast.success('Bank documents uploaded successfully!'); },
    onError: () => toast.error('Failed to upload bank documents.')
  });

  const reqMutation = useMutation({
    mutationFn: () => kycService.requestReview(bid),
    onSuccess: () => { qc.invalidateQueries(['my-kyc']); toast.success('KYC Review Requested!'); },
    onError: () => toast.error('Failed to request review.'),
  });

  if (bLoad || kLoad) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!borrower) return <div className="alert alert-danger">Borrower profile not found.</div>;

  const kycStatus = KYC_STATUS_MAP[kyc?.overall_status] || { label: kyc?.overall_status || 'NOT_STARTED', cls: 'badge-gray' };
  const isVerified = kyc?.overall_status === 'VERIFIED';

  const existingDocs = kyc?.documents || [];
  const hasPanFront = existingDocs.some(d => d.document_type === 'PAN_FRONT');
  const hasPanBack = existingDocs.some(d => d.document_type === 'PAN_BACK');
  const hasAadhaarFront = existingDocs.some(d => d.document_type === 'AADHAAR_FRONT');
  const hasAadhaarBack = existingDocs.some(d => d.document_type === 'AADHAAR_BACK');

  return (
    <motion.div style={{ maxWidth: 800 }} initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeInUp} className="page-header">
        <h1 className="page-title">KYC Identity Verification</h1>
        <p className="page-subtitle">Verify your PAN, Aadhaar, and Bank details securely with bank-grade encryption</p>
      </motion.div>

      {/* Security Guarantee Banner */}
      <motion.div variants={fadeInUp} className="card mb-6" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
          <Lock size={32} style={{ color: '#eab308', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
              🔒 Super Secure & Encrypted Storage
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Your PAN & Aadhaar numbers and front/back card images are encrypted at rest with AES-256 and restricted to authorized compliance auditors. Third parties cannot access your sensitive data.
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overall Status Card */}
      <motion.div variants={fadeInUp} className="card mb-6">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>Overall KYC Status</div>
            <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Verified profiles enable instant loan disbursements and auto agreements.</div>
          </div>
          <span className={`badge ${kycStatus.cls}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {isVerified && <CheckCircle2 size={14} style={{ marginRight: '0.35rem', display: 'inline' }} />}
            {kycStatus.label}
          </span>
        </div>
      </motion.div>

      <motion.div variants={stagger} style={{ display: 'grid', gap: '1.5rem' }}>
        
        {/* ================= PAN CARD VERIFICATION ================= */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>1. PAN Card Verification</span>
            <span className={`badge ${KYC_STATUS_MAP[kyc?.pan_status]?.cls || 'badge-gray'}`}>
              {KYC_STATUS_MAP[kyc?.pan_status]?.label || 'Not Started'}
            </span>
          </div>
          <div className="card-body">
            {kyc?.pan_status === 'VERIFIED' ? (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>PAN Verified Successfully</strong>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.15rem' }}>
                    Masked PAN: {kyc?.masked_pan || borrower.masked_pan || 'ABCDE****F'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem' }}>
                  Enter your 10-character Permanent Account Number (PAN) and upload clear Front and Back images of your PAN card.
                </p>

                <div className="form-group mb-4" style={{ maxWidth: 320 }}>
                  <label className="form-label">PAN Card Number</label>
                  <input
                    className="form-control"
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={e => setPan(e.target.value.toUpperCase().trim())}
                    maxLength={10}
                    style={{ letterSpacing: '2px', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                    <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>PAN Card Front Image</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginBottom: '0.5rem' }}>JPG, PNG or PDF (Max 5MB)</div>
                    <input type="file" id="pan_front_input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setPanFrontFile(e.target.files[0])} />
                    <label htmlFor="pan_front_input" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {panFrontFile ? panFrontFile.name : (hasPanFront ? '✓ Uploaded (Change)' : 'Select Front File')}
                    </label>
                  </div>

                  <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                    <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>PAN Card Back Image</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginBottom: '0.5rem' }}>JPG, PNG or PDF (Max 5MB)</div>
                    <input type="file" id="pan_back_input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setPanBackFile(e.target.files[0])} />
                    <label htmlFor="pan_back_input" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {panBackFile ? panBackFile.name : (hasPanBack ? '✓ Uploaded (Change)' : 'Select Back File')}
                    </label>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => panMutation.mutate()}
                  disabled={pan.length !== 10 || (!panFrontFile && !hasPanFront) || (!panBackFile && !hasPanBack) || panMutation.isPending}
                >
                  {panMutation.isPending ? <span className="spinner" /> : 'Submit & Verify PAN'}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ================= AADHAAR VERIFICATION ================= */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>2. Aadhaar Card / e-KYC Verification</span>
            <span className={`badge ${KYC_STATUS_MAP[kyc?.aadhaar_status]?.cls || 'badge-gray'}`}>
              {KYC_STATUS_MAP[kyc?.aadhaar_status]?.label || 'Not Started'}
            </span>
          </div>
          <div className="card-body">
            {kyc?.aadhaar_status === 'VERIFIED' ? (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Aadhaar Verified Successfully</strong>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.15rem' }}>
                    Masked Aadhaar: {kyc?.masked_aadhaar || borrower.masked_aadhaar || 'XXXX XXXX 1234'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem' }}>
                  Enter your 12-digit Aadhaar Number and upload clear Front and Back images of your Aadhaar card.
                </p>

                <div className="form-group mb-4" style={{ maxWidth: 320 }}>
                  <label className="form-label">Aadhaar Card Number</label>
                  <input
                    className="form-control"
                    placeholder="1234 5678 9012"
                    value={aadhaar}
                    onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
                    maxLength={12}
                    style={{ letterSpacing: '2px', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                    <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Aadhaar Front Image</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginBottom: '0.5rem' }}>JPG, PNG or PDF (Max 5MB)</div>
                    <input type="file" id="aadhaar_front_input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setAadhaarFrontFile(e.target.files[0])} />
                    <label htmlFor="aadhaar_front_input" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {aadhaarFrontFile ? aadhaarFrontFile.name : (hasAadhaarFront ? '✓ Uploaded (Change)' : 'Select Front File')}
                    </label>
                  </div>

                  <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                    <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Aadhaar Back Image</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginBottom: '0.5rem' }}>JPG, PNG or PDF (Max 5MB)</div>
                    <input type="file" id="aadhaar_back_input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setAadhaarBackFile(e.target.files[0])} />
                    <label htmlFor="aadhaar_back_input" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {aadhaarBackFile ? aadhaarBackFile.name : (hasAadhaarBack ? '✓ Uploaded (Change)' : 'Select Back File')}
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="checkbox"
                    id="aadhaar_consent"
                    checked={aadhaarConsent}
                    onChange={e => setAadhaarConsent(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <label htmlFor="aadhaar_consent" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', cursor: 'pointer' }}>
                    I authorize K-CUBE Audit & FinServ to verify my Aadhaar identity details for loan KYC compliance purposes.
                  </label>
                </div>

                {!otpSent ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => aadhaarInitiateMutation.mutate()}
                    disabled={aadhaar.length !== 12 || (!aadhaarFrontFile && !hasAadhaarFront) || (!aadhaarBackFile && !hasAadhaarBack) || !aadhaarConsent || aadhaarInitiateMutation.isPending}
                  >
                    {aadhaarInitiateMutation.isPending ? <span className="spinner" /> : 'Send Aadhaar OTP'}
                  </button>
                ) : (
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <KeyRound size={18} style={{ color: 'var(--color-primary)' }} /> Enter 6-Digit OTP
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: '1rem' }}>
                      An OTP has been sent to your Aadhaar-registered mobile number (or use demo code: 123456).
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        className="form-control"
                        placeholder="123456"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        style={{ maxWidth: 160, letterSpacing: '3px', fontWeight: 700 }}
                      />
                      <button
                        className="btn btn-success"
                        onClick={() => aadhaarOtpMutation.mutate()}
                        disabled={otp.length !== 6 || aadhaarOtpMutation.isPending}
                      >
                        {aadhaarOtpMutation.isPending ? <span className="spinner" /> : 'Verify OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ================= BANK ACCOUNT DETAILS ================= */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>3. Bank Account & Statement Upload</span>
            <span className={`badge ${KYC_STATUS_MAP[kyc?.bank_account_status]?.cls || 'badge-gray'}`}>
              {KYC_STATUS_MAP[kyc?.bank_account_status]?.label || 'Not Started'}
            </span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem' }}>
              Provide the bank account for loan disbursement and upload a recent 6-month bank statement and passbook copy.
            </p>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <input className="form-control" value={bankForm.account_holder_name} onChange={e => setBankForm(p => ({...p, account_holder_name: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-control" type="password" value={bankForm.account_number} onChange={e => setBankForm(p => ({...p, account_number: e.target.value.replace(/\D/g, '')}))} placeholder="Enter account number" />
              </div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input className="form-control" value={bankForm.bank_name} onChange={e => setBankForm(p => ({...p, bank_name: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input className="form-control" value={bankForm.branch_name} onChange={e => setBankForm(p => ({...p, branch_name: e.target.value}))} />
              </div>
            </div>
            <div className="form-grid form-grid-2 mb-4">
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input className="form-control" value={bankForm.ifsc_code} onChange={e => setBankForm(p => ({...p, ifsc_code: e.target.value.toUpperCase()}))} maxLength={11} placeholder="e.g. SBIN0001234" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-control" value={bankForm.account_type} onChange={e => setBankForm(p => ({...p, account_type: e.target.value}))}>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CURRENT">Current Account</option>
                  <option value="SALARY">Salary Account</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>6-Month Bank Statement</div>
                <input type="file" id="bank_statement" accept=".pdf,.png,.jpg" style={{ display: 'none' }} onChange={e => setBankStatementFile(e.target.files[0])} />
                <label htmlFor="bank_statement" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {bankStatementFile ? bankStatementFile.name : 'Select Statement PDF'}
                </label>
              </div>

              <div style={{ border: '1.5px dashed var(--color-gray-300)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--color-gray-50)' }}>
                <Upload size={22} style={{ margin: '0 auto 0.35rem', color: 'var(--color-primary)' }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Bank Passbook (Front Page)</div>
                <input type="file" id="bank_passbook" accept=".pdf,.png,.jpg" style={{ display: 'none' }} onChange={e => setPassbookFile(e.target.files[0])} />
                <label htmlFor="bank_passbook" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {passbookFile ? passbookFile.name : 'Select Passbook File'}
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => { bankMutation.mutate(bankForm); if (bankStatementFile || passbookFile) bankDocsMutation.mutate(); }} 
                disabled={bankMutation.isPending || !bankForm.account_number || !bankForm.ifsc_code || !bankForm.account_holder_name}
              >
                {bankMutation.isPending ? <span className="spinner" /> : 'Save Bank Details & Uploads'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ================= FINAL ADMIN REVIEW REQUEST ================= */}
        <motion.div variants={fadeInUp} className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <ShieldCheck size={44} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Submit for Final Admin Approval</h3>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: '1.5rem', fontSize: '0.875rem', maxWidth: 460, margin: '0 auto 1.5rem' }}>
              Once your PAN, Aadhaar, and Bank documents are provided, request a compliance audit review to activate your borrowing privileges.
            </p>
            <button
              className="btn btn-gold"
              onClick={() => reqMutation.mutate()}
              disabled={kyc?.overall_status === 'PENDING_REVIEW' || kyc?.overall_status === 'VERIFIED' || reqMutation.isPending}
            >
              {reqMutation.isPending ? <span className="spinner" /> : 'Request Final KYC Review'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
