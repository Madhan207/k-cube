import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ExternalLink } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <img 
                src="/logo.png" 
                alt="K-CUBE Audit & FinServ" 
                style={{ height: '66px', width: 'auto', objectFit: 'contain' }} 
              />
            </div>
            <p className="footer-desc">
              Professional financial services including Audit, Tax Compliance, ITR Filing, GST, TDS and Easy Digital Loan solutions for individuals and businesses.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <a href="tel:+919865682992" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                <Phone size={18} style={{ color: 'var(--color-gold-light)', flexShrink: 0 }} />
                +91 98656 82992
              </a>
              <a href="mailto:hrkcube@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                <Mail size={18} style={{ color: 'var(--color-gold-light)', flexShrink: 0 }} />
                hrkcube@gmail.com
              </a>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '1rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                <MapPin size={18} style={{ color: 'var(--color-gold-light)', flexShrink: 0, marginTop: '3px' }} />
                #7, KVS Complex, Salem Main Road, Kalipatti
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="footer-heading">Services</div>
            <div className="footer-links">
              {['Business ITR', 'Salary ITR', 'TDS Return', 'GST Filing', 'Tax & Compliance', 'Loan Services'].map(s => (
                <Link key={s} to="/services">{s}</Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="footer-heading">Quick Links</div>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/login">Client Login</Link>
              <Link to="/register">Register</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="footer-heading">Legal</div>
            <div className="footer-links">
              <Link to="#">Privacy Policy</Link>
              <Link to="#">Terms of Service</Link>
              <Link to="#">KYC Policy</Link>
              <Link to="#">Grievance Policy</Link>
              <Link to="#">Disclaimer</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
          <span>© {year} K-CUBE Audit & FinServ. All rights reserved.</span>
          <span>MasterMind Group | Powered by K-CUBE LMS v1.0</span>
        </div>
      </div>
    </footer>
  );
}
