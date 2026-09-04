import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ShieldCheck, CreditCard, Receipt, FileText,
  FolderOpen, Building2, BarChart3, UserCog, ScrollText, Settings,
  LogOut, Menu, X, Bell, ChevronDown, User
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { section: 'Overview', items: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Customers', items: [
    { to: '/admin/borrowers', icon: Users, label: 'Borrowers' },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC Management' },
  ]},
  { section: 'Financial', items: [
    { to: '/admin/loans', icon: CreditCard, label: 'Loans' },
    { to: '/admin/payments', icon: Receipt, label: 'Payments' },
    { to: '/admin/agreements', icon: FileText, label: 'Agreements' },
  ]},
  { section: 'System', items: [
    { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ]},
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img 
            src="/logo.png" 
            alt="K-CUBE" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ section, items }) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="sidebar-icon" size={18} />
                  {label}
                  {badge && <span className="sidebar-badge">{badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link w-full" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={18} className="sidebar-icon" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-content">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }}
              id="sidebar-toggle"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', display: 'block' }}>
                Admin Panel
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                K-CUBE Audit & FinServ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2" style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--color-gray-100)', cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{user?.full_name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-page">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
