import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, ShieldCheck, CreditCard,
  Receipt, FileText, FolderOpen, LogOut, Home
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/profile', icon: User, label: 'My Profile' },
  { to: '/dashboard/kyc', icon: ShieldCheck, label: 'KYC' },
  { to: '/dashboard/loans', icon: CreditCard, label: 'My Loans' },
  { to: '/dashboard/payments', icon: Receipt, label: 'Payments' },
  { to: '/dashboard/agreements', icon: FileText, label: 'Agreements' },
  { to: '/dashboard/documents', icon: FolderOpen, label: 'Documents' },
];

export default function BorrowerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img 
            src="/logo.png" 
            alt="K-CUBE" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* User Info */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark)', fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>
            {user?.full_name?.charAt(0)?.toUpperCase() || 'B'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{user?.full_name}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{user?.email}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="sidebar-icon" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href="/" className="sidebar-link" style={{ display: 'flex' }}>
            <Home size={18} className="sidebar-icon" />
            Back to Website
          </a>
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={18} className="sidebar-icon" />
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', display: 'block' }}>Borrower Portal</span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>K-CUBE Audit & FinServ</span>
          </div>
          <div className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
            Borrower Account
          </div>
        </header>
        <main className="admin-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
