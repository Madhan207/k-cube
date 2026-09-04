import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Shield, FileText, CreditCard, CheckCircle2,
  Phone, Mail, MapPin, TrendingUp, Users, Award, Zap,
  Calculator, ClipboardCheck, Building2, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const services = [
  { icon: BookOpen,    title: 'Business ITR',        desc: 'Complete ITR filing for businesses of all types including proprietorships, partnerships, and companies.', image: '/service_tax.png' },
  { icon: Users,       title: 'Salary ITR',           desc: 'Hassle-free Income Tax Return filing for salaried employees with maximum refund optimization.', image: '/service_tax.png' },
  { icon: FileText,    title: 'TDS Return',           desc: 'Accurate TDS return filing and compliance management to avoid penalties and interest charges.', image: '/service_tax.png' },
  { icon: Building2,   title: 'GST Filing',           desc: 'End-to-end GST registration, monthly/quarterly return filing, and reconciliation services.', image: '/service_tax.png' },
  { icon: ClipboardCheck, title: 'Tax & Compliance', desc: 'Comprehensive tax planning, audit support, and regulatory compliance for businesses.', image: '/service_audit.png' },
  { icon: CreditCard,  title: 'Easy Digital Loans',        desc: 'Structured easy digital loans, agreement generation, and repayment scheduling services.', image: '/service_loans.png' },
];

const features = [
  { icon: Zap,      title: 'Easy Digital Loans',    desc: 'Fast digital loan application, instant agreement generation, and payment tracking.' },
  { icon: FileText, title: 'Digital Agreements',     desc: 'Legally structured DOCX and PDF loan agreements generated automatically.' },
  { icon: Calculator, title: 'Smart Calculator',     desc: 'Flexible loan calculator with both Flat Rate and Reducing Balance methods.' },
  { icon: TrendingUp, title: 'Real-Time Tracking',     desc: 'Live payment tracking, amortization schedules, and balance updates.' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

export default function HomePage() {
  const { user } = useAuth();
  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-content" style={{ padding: '3.25rem 1.5rem 2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
            <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
              <motion.div variants={fadeInUp} className="hero-badge" style={{ marginBottom: '0.875rem' }}>
                <Award size={14} />
                MasterMind Group Company
              </motion.div>
              <motion.h1 variants={fadeInUp} className="hero-title">
                Expert <span>Audit & FinServ</span><br />Solutions for Growth
              </motion.h1>
              <motion.p variants={fadeInUp} className="hero-subtitle">
                K-CUBE Audit & FinServ provides comprehensive tax, compliance, and financial services — with a modern platform for easy digital loans.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex gap-3 flex-wrap">
                {user ? (
                  <Link to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} className="btn btn-gold btn-lg pulse-gold">
                    Go to Dashboard <ArrowRight size={18} />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-gold btn-lg pulse-gold">
                      Open Account <ArrowRight size={18} />
                    </Link>
                    <Link to="/services" className="btn btn-outline btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
                      Our Services
                    </Link>
                  </>
                )}
              </motion.div>

              {/* Trust Indicators */}
              <motion.div variants={fadeInUp} className="flex gap-4 flex-wrap mt-5" style={{ marginTop: '1.5rem' }}>
                {['Easy Loans', 'Secure Platform', 'Digital Agreements'].map(t => (
                  <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--color-gold-light)', flexShrink: 0 }} />
                    <span>{t}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '340px',
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <img 
                    src="/logo.png" 
                    alt="K-CUBE Audit & FinServ" 
                    style={{ height: '56px', width: 'auto', margin: '0 auto 0.5rem', display: 'block', objectFit: 'contain' }} 
                  />
                  <div style={{ color: 'var(--color-gold-light)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>MasterMind Group</div>
                </div>
                {[
                  { label: 'Business ITR', check: true },
                  { label: 'GST Filing', check: true },
                  { label: 'Easy Digital Loans', check: true },
                  { label: 'Easy Loan', check: true },
                  { label: 'Digital Agreements', check: true },
                ].map(({ label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--color-gold-light)', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
                  </div>
                ))}
                <Link to="/register" className="btn btn-gold btn-full mt-3" style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>
                  Get Started Today
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      <section className="section">
        <div className="container">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeInUp}
            className="section-header text-center"
          >
            <div style={{ display: 'inline-block' }}>
              <div className="section-divider" style={{ margin: '0 auto 0.75rem' }}></div>
            </div>
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle mx-auto" style={{ textAlign: 'center' }}>
              Comprehensive financial and compliance services designed to help individuals and businesses thrive.
            </p>
          </motion.div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="services-grid mt-8" 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
          >
            {services.map(({ icon: Icon, title, desc, image }) => (
              <motion.div 
                key={title} 
                variants={fadeInUp}
                className="service-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  background: 'white', 
                  border: '1px solid var(--color-gray-200)', 
                  borderRadius: '1.25rem', 
                  overflow: 'hidden', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)', 
                  transition: 'all 0.3s ease' 
                }}
              >
                <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                  <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(13,45,26,0.55))' }} />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '0.75rem', 
                    left: '1rem', 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '0.5rem', 
                    background: 'var(--color-white)', 
                    color: 'var(--color-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                  }}>
                    <Icon size={20} />
                  </div>
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>{title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', lineHeight: 1.6, flex: 1, margin: 0 }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ LOAN PLATFORM ============ */}
      <section className="section section-alt">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={fadeInUp}
            >
              <div className="section-divider"></div>
              <h2 className="section-title">Easy Digital Loan</h2>
              <p style={{ color: 'var(--color-gray-500)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                A simple, fast, and end-to-end digital loan system — from instant loan application and agreement generation to easy payment tracking.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: Zap, text: 'Fast & easy digital loan application process' },
                  { icon: FileText, text: 'Professionally formatted DOCX and PDF loan agreements' },
                  { icon: Calculator, text: 'Flexible EMI calculation — Flat Rate or Reducing Balance' },
                  { icon: TrendingUp, text: 'Complete amortization schedule with payment tracking' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={17} style={{ color: 'white' }} />
                    </div>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-700)', paddingTop: '0.5rem' }}>{text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                {user ? (
                  <Link to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} className="btn btn-primary">
                    Go to Dashboard <ArrowRight size={16} />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-primary">Open Account</Link>
                    <Link to="/login" className="btn btn-outline">Login</Link>
                  </>
                )}
              </div>
            </motion.div>

            {/* Platform Mockup Image */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={fadeInScale}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <div style={{
                position: 'relative',
                borderRadius: '1.25rem',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(13,45,26,0.18)',
                border: '2px solid rgba(184, 134, 0, 0.3)',
                maxWidth: '580px',
                width: '100%',
                background: 'white'
              }}>
                <img 
                  src="/platform_mockup.png" 
                  alt="K-CUBE Audit & FinServ Official Banner" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="section">
        <div className="container">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeInUp}
            className="section-header text-center"
          >
            <div className="section-divider" style={{ margin: '0 auto 0.75rem' }}></div>
            <h2 className="section-title">Why K-CUBE Audit & FinServ?</h2>
            <p className="section-subtitle mx-auto" style={{ textAlign: 'center' }}>
              Built for reliability, speed, and regulatory compliance.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="grid grid-cols-4 gap-6 mt-8" 
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
          >
            {features.map(({ icon: Icon, title, desc }) => (
              <motion.div 
                key={title} 
                variants={fadeInUp}
                style={{ 
                  background: 'white', 
                  padding: '1.75rem 1.5rem', 
                  borderRadius: '1.25rem', 
                  border: '1px solid var(--color-gray-200)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s ease'
                }}
                className="service-card"
              >
                <div className="service-icon">
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}
