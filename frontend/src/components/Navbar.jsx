import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="navbar" 
      style={{ 
        background: scrolled ? 'rgba(13, 45, 26, 0.96)' : 'rgba(26, 74, 46, 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.35)' : 'none',
        transition: 'background 300ms ease, box-shadow 300ms ease'
      }}
    >
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="K-CUBE Audit & FinServ" 
            style={{ height: '54px', width: 'auto', objectFit: 'contain' }} 
          />
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar-nav" style={{ display: menuOpen ? 'none' : undefined }}>
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink></li>
          <li><NavLink to="/services" className={({ isActive }) => isActive ? 'active' : ''}>Services</NavLink></li>
          <li><NavLink to="/about" className={({ isActive }) => isActive ? 'active' : ''}>About</NavLink></li>
          <li><NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>Contact</NavLink></li>
        </ul>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to={isAdmin ? '/admin/dashboard' : '/dashboard'}
                className="btn btn-ghost"
                style={{ color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.9375rem', fontWeight: 600, padding: '0.5rem 1rem' }}
              >
                <LayoutDashboard size={17} />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-gold"
                style={{ fontSize: '0.9375rem', fontWeight: 700, padding: '0.5rem 1rem' }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.9375rem', fontWeight: 600, padding: '0.5rem 1.1rem' }}>
                Login
              </Link>
              <Link to="/register" className="btn btn-gold" style={{ fontSize: '0.9375rem', fontWeight: 700, padding: '0.5rem 1.1rem' }}>
                Get Started
              </Link>
            </>
          )}

          {/* Mobile Toggle */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'white', display: 'none' }}
            id="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 'var(--header-height)', left: 0, right: 0,
          background: 'var(--color-primary-dark)', padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 99,
          display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          {[
            { to: '/', label: 'Home', end: true },
            { to: '/services', label: 'Services' },
            { to: '/about', label: 'About' },
            { to: '/contact', label: 'Contact' },
          ].map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.8)', borderRadius: '0.5rem', display: 'block' }}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </motion.nav>
  );
}
