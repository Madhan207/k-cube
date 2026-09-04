import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, Send } from 'lucide-react';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.data?.message || 'If an account exists for this email address, you will receive password reset instructions shortly.');
      setSubmitted(true);
    } catch (err) {
      // Even on error, show generic message for anti-enumeration
      setMessage('If an account exists for this email address, you will receive password reset instructions shortly.');
      setSubmitted(true);
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
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/">
            <img 
              src="/logo.png" 
              alt="K-CUBE Audit & FinServ" 
              style={{ height: '60px', width: 'auto', margin: '0 auto 1rem', display: 'block', objectFit: 'contain' }} 
            />
          </Link>
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Forgot Password?</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem' }}>
            Enter your registered email address and we'll send you a secure password reset link.
          </p>
        </div>

        <div className="card" style={{ borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div className="card-body" style={{ padding: '2.25rem 2rem' }}>
            {submitted ? (
              <div className="text-center fade-in">
                <div style={{ width: 64, height: 64, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Send size={30} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Instructions Sent</h3>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  {message}
                </p>
                <Link to="/login" className="btn btn-primary btn-full" style={{ padding: '0.75rem' }}>
                  Remember your password? Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--color-primary-50)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <KeyRound size={26} />
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                    Enter your registered email address and we'll send you a secure password reset link.
                  </p>
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={{ height: '3rem' }}
                  />
                </div>
                
                <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading} style={{ height: '3rem', fontWeight: 700 }}>
                  {loading ? <span className="spinner" /> : 'Send Reset Link'}
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Remember your password? Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
