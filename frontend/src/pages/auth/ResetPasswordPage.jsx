import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Check, X, CheckCircle2, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { uid, token } = useParams();

  const [checking, setChecking] = useState(true);
  const [tokenState, setTokenState] = useState('VALID'); // VALID | EXPIRED | USED | INVALID
  const [userEmail, setUserEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate token status on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await authService.validateResetToken(uid, token);
        if (res.data?.valid) {
          setTokenState('VALID');
          setUserEmail(res.data?.email || '');
        } else {
          setTokenState(res.data?.status || 'INVALID');
        }
      } catch (err) {
        const status = err.response?.data?.status || 'INVALID';
        setTokenState(status);
      } finally {
        setChecking(false);
      }
    }
    validateToken();
  }, [uid, token]);

  // Real-time password requirement validations
  const requirements = [
    { label: 'Minimum 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = requirements.every(r => r.met);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!allRequirementsMet) {
      toast.error('Please meet all password security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setResetSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to reset password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '460px' }}
      >
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/">
            <img 
              src="/logo.png" 
              alt="K-CUBE Audit & FinServ" 
              style={{ height: '60px', width: 'auto', margin: '0 auto 1rem', display: 'block', objectFit: 'contain' }} 
            />
          </Link>
        </div>

        <div className="card" style={{ borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
          <div className="card-body" style={{ padding: '2.25rem 2rem' }}>

            {/* State 1: Checking Token Loading */}
            {checking && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9375rem' }}>Verifying security token...</p>
              </div>
            )}

            {/* State 2: Reset Success */}
            {!checking && resetSuccess && (
              <div className="text-center fade-in">
                <div style={{ width: 64, height: 64, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Password Reset Successful ✓</h2>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  Your password has been successfully updated. You can now log in using your new password.
                </p>
                <Link to="/login" className="btn btn-primary btn-full" style={{ height: '3.25rem', fontSize: '1rem', fontWeight: 700 }}>
                  Login Now
                </Link>
              </div>
            )}

            {/* State 3: Expired Token */}
            {!checking && !resetSuccess && tokenState === 'EXPIRED' && (
              <div className="text-center fade-in">
                <div style={{ width: 64, height: 64, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <AlertTriangle size={32} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Reset Link Expired</h2>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  This password reset link has expired after 30 minutes. Please request a new password reset link.
                </p>
                <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ height: '3rem', fontWeight: 700 }}>
                  Request New Link
                </Link>
              </div>
            )}

            {/* State 4: Already Used Token */}
            {!checking && !resetSuccess && tokenState === 'USED' && (
              <div className="text-center fade-in">
                <div style={{ width: 64, height: 64, background: 'var(--color-info-bg)', color: 'var(--color-info)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <KeyRound size={32} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Link Already Used</h2>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  This password reset link has already been used. Please request a new password reset link if you need to reset your password again.
                </p>
                <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ height: '3rem', fontWeight: 700 }}>
                  Request New Link
                </Link>
              </div>
            )}

            {/* State 5: Invalid Token */}
            {!checking && !resetSuccess && tokenState === 'INVALID' && (
              <div className="text-center fade-in">
                <div style={{ width: 64, height: 64, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <X size={32} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Invalid Reset Link</h2>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  This password reset link is invalid or no longer available.
                </p>
                <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ height: '3rem', fontWeight: 700 }}>
                  Request New Reset Link
                </Link>
              </div>
            )}

            {/* State 6: Valid Form */}
            {!checking && !resetSuccess && tokenState === 'VALID' && (
              <form onSubmit={handleSubmit} className="fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.35rem' }}>Create New Password</h2>
                  {userEmail && (
                    <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>for <strong>{userEmail}</strong></p>
                  )}
                </div>

                {errorMsg && (
                  <div className="alert alert-danger" style={{ borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* New Password Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="new-password">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPwd ? 'text' : 'password'}
                      className="form-control"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', height: '3rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: '0.25rem' }}
                    >
                      {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPwd ? 'text' : 'password'}
                      className="form-control"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', height: '3rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: '0.25rem' }}
                    >
                      {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.785rem', marginTop: '0.375rem', fontWeight: 600 }}>
                      Passwords do not match.
                    </p>
                  )}
                </div>

                {/* Password Requirements List */}
                <div style={{ background: 'var(--color-gray-50)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-gray-200)' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: '0.625rem' }}>Password requirements:</p>
                  <div style={{ display: 'grid', gap: '0.375rem' }}>
                    {requirements.map((req, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: req.met ? 'var(--color-success)' : 'var(--color-gray-500)', fontWeight: req.met ? 600 : 400 }}>
                        {req.met ? <Check size={14} style={{ flexShrink: 0 }} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--color-gray-300)', flexShrink: 0 }} />}
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full mt-2"
                  disabled={loading || !allRequirementsMet || !passwordsMatch}
                  style={{ height: '3.25rem', fontSize: '1rem', fontWeight: 700 }}
                >
                  {loading ? <span className="spinner" /> : 'Reset Password'}
                </button>
              </form>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
}
