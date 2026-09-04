import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back!`);
      const role = data?.role || '';
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.detail 
        || err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.error
        || 'Invalid email or password. Please check your credentials and try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-white)' }}>
      {/* Left side: Premium Branding Graphic */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)', 
        position: 'relative', 
        overflow: 'hidden', 
        display: 'none', 
        '@media (min-width: 992px)': { display: 'flex' } 
      }} className="hide-on-mobile login-hero">
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', zIndex: 10 
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <Link to="/">
              <img 
                src="/logo.png" 
                alt="K-CUBE Audit & FinServ" 
                style={{ height: '64px', width: 'auto', objectFit: 'contain' }} 
              />
            </Link>
          </div>
          <h1 style={{ color: 'white', fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Secure.<br/>Transparent.<br/><span style={{ color: 'var(--color-gold-light)' }}>Financing.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.125rem', maxWidth: '420px', lineHeight: 1.7 }}>
            Access your personalized dashboard to manage loans, track your repayment schedules, and download agreements instantly.
          </p>
          
          <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="var(--color-gold-light)" />
              </div>
              <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>Bank-Grade Security</span>
            </div>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div style={{ position: 'absolute', top: '-15%', right: '-15%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(184,134,0,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>
      
      {/* Right side: Form */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '2rem', 
        position: 'relative'
      }}>
        {/* Mobile Logo Fallback */}
        <div className="show-on-mobile-only" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Link to="/">
            <img 
              src="/logo.png" 
              alt="K-CUBE Audit & FinServ" 
              style={{ height: '52px', width: 'auto', margin: '0 auto 1rem', display: 'block', objectFit: 'contain' }} 
            />
          </Link>
        </div>

        <motion.div
          style={{ width: '100%', maxWidth: '440px' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
        >
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Welcome Back</h2>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '1rem' }}>Enter your credentials to access your account.</p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '2rem', borderRadius: '0.75rem' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email">Email or Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }}>
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="text"
                  className="form-control"
                  placeholder="you@example.com or 9XXXXXXXXX"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  autoComplete="email"
                  style={{ paddingLeft: '2.75rem', height: '3.25rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }}>
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', height: '3.25rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: '0.25rem' }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='var(--color-primary-light)'} onMouseOut={e => e.target.style.color='var(--color-primary)'}>
                Forgot Password?
              </Link>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full"
              style={{ height: '3.25rem', fontSize: '1.0625rem', marginTop: '0.5rem', borderRadius: '0.75rem' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : (
                <>Sign In <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <span style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Register now</Link>
            </span>
          </div>
        </motion.div>
      </div>
      
      {/* Hide/Show logic for mobile */}
      <style>{`
        @media (min-width: 992px) {
          .hide-on-mobile { display: flex !important; }
          .show-on-mobile-only { display: none !important; }
        }
        @media (max-width: 991px) {
          .hide-on-mobile { display: none !important; }
          .show-on-mobile-only { display: block !important; }
        }
      `}</style>
    </div>
  );
}
