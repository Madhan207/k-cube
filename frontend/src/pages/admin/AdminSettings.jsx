import { Settings, Shield, Bell, Key } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure system preferences and defaults</p>
      </div>

      <div className="card mb-6">
        <div className="card-header" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Settings size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 700 }}>General Settings</span>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            System configuration for K-CUBE Audit & FinServ platform. These settings affect all users.
          </p>
          <div className="form-group">
            <label className="form-label">Default Interest Rate (%)</label>
            <input className="form-control" type="number" defaultValue="18.00" disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Default Grace Period (Days)</label>
            <input className="form-control" type="number" defaultValue="7" disabled />
          </div>
          <button className="btn btn-primary" disabled>Save Changes</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Shield size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 700 }}>Security & API Integrations</span>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Manage API keys for third-party integrations (PAN, Aadhaar). Contact super-admin to modify these settings.
          </p>
          <div className="form-group">
            <label className="form-label">KYC Provider Mode</label>
            <select className="form-control" disabled defaultValue="MOCK">
              <option value="MOCK">Mock (Development)</option>
              <option value="LIVE">Live (Production)</option>
            </select>
          </div>
          <button className="btn btn-outline" disabled>Update Integrations</button>
        </div>
      </div>
    </div>
  );
}
