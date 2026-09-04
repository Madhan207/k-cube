import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ShieldCheck, CheckCircle2, ArrowRight, Building2, Users, FileText, Lock } from 'lucide-react';

const stats = [
  { label: 'Tax & Compliance', val: '100%', sub: 'Accuracy Guaranteed' },
  { label: 'Digital Agreements', val: 'Instant', sub: 'DOCX & PDF Support' },
  { label: 'Easy Loans', val: 'Fast Access', sub: 'Seamless Processing' },
  { label: 'Client Support', val: 'Dedicated', sub: 'Expert Consultation' },
];

const values = [
  { title: 'Integrity & Ethics', desc: 'Upholding the highest standards of professional ethics in every audit, tax filing, and financial assessment.' },
  { title: 'Transparency', desc: 'Clear, straightforward terms with no hidden fees or complex jargon. Complete clarity for clients.' },
  { title: 'Innovation & Speed', desc: 'Leveraging modern digital platforms for automated loan agreements, amortization schedules, and easy digital loans.' },
  { title: 'Client Centricity', desc: 'Tailored financial solutions designed specifically for your unique personal or business needs.' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09 } }
};

export default function AboutPage() {
  return (
    <div>
      {/* ============ HERO HEADER ============ */}
      <div
        className="section section-dark text-center"
        style={{
          padding: '7rem 1.5rem 5rem',
          backgroundImage: 'linear-gradient(135deg, rgba(13, 45, 26, 0.88), rgba(13, 45, 26, 0.98)), url("/service_header.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          borderBottom: '3px solid var(--color-gold)'
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="container"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <motion.div variants={fadeInUp} className="hero-badge float-slow" style={{ margin: '0 auto 1.25rem', display: 'inline-flex' }}>
            <Award size={15} />
            MasterMind Group Company
          </motion.div>
          <motion.h1 variants={fadeInUp} style={{ fontSize: '3.25rem', fontWeight: 900, color: 'white', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            About K-CUBE
          </motion.h1>
          <motion.p variants={fadeInUp} style={{ color: 'var(--color-gold-light)', fontSize: '1.2rem', fontWeight: 600, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Premier Financial & Compliance Organization dedicated to excellence in Audit, FinServ, and Digital Loan Solutions.
          </motion.p>
        </motion.div>
      </div>

      {/* ============ STATS BAR ============ */}
      <div style={{ background: 'var(--color-primary-dark)', padding: '2rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'center' }}
          >
            {stats.map(s => (
              <motion.div key={s.label} variants={fadeInUp} style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-gold-light)', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '0.375rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>{s.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ============ MAIN BRAND SHOWCASE ============ */}
      <div className="section container" style={{ padding: '5rem 1.5rem' }}>

        {/* Row 1: Promo Overview Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center', marginBottom: '5rem' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeInUp}
          >
            <div className="badge badge-gold" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}>
              <Building2 size={14} /> Corporate Profile
            </div>
            <h2 style={{ fontSize: '2.35rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginBottom: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Expertise You Can Trust
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-gray-700)', marginBottom: '1.25rem' }}>
              <strong>K-CUBE Audit & FinServ</strong> operates under the prestigious umbrella of the <strong>MasterMind Group</strong>. We are a premier financial firm offering end-to-end Solutions in Income Tax Filing (Business & Salary ITR), GST Compliance, TDS Returns, Audit Certification, and Easy Digital Loans.
            </p>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-gray-700)', marginBottom: '2rem' }}>
              Our mission is to simplify complex financial regulations and empower businesses and individuals with robust compliance frameworks and accessible financing options.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/contact" className="btn btn-primary btn-lg">
                Get Expert Advice <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: 'easeOut' } } }}
            className="banner-frame float-slow"
          >
            <img
              src="/banner_promo.jpg"
              alt="K-CUBE Audit & FinServ MasterMind Group Overview"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </motion.div>
        </div>

        {/* Row 2: Solutions & Pillars Showcase */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: 'easeOut' } } }}
            className="banner-frame float-slow"
            style={{ order: 1 }}
          >
            <img
              src="/banner_showcase.jpg"
              alt="K-CUBE Tax & Compliance Solutions Showcase"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            style={{ order: 2 }}
          >
            <motion.div variants={fadeInUp} className="badge badge-primary" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}>
              <ShieldCheck size={14} /> Full Spectrum FinServ
            </motion.div>
            <motion.h2 variants={fadeInUp} style={{ fontSize: '2.35rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginBottom: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Your Trusted Partner for Compliance
            </motion.h2>
            <motion.p variants={fadeInUp} style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-gray-700)', marginBottom: '1.5rem' }}>
              Our digital-first architecture ensures seamless easy digital loans and automatic loan amortization tracking.
            </motion.p>

            <motion.div variants={fadeInUp} style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { title: 'Business & Salary ITR', sub: 'Stay compliant, maximize legal tax refunds.' },
                { title: 'TDS & GST Compliance', sub: 'Timely filing, zero penalty assurance.' },
                { title: 'Digital Loan Agreements', sub: 'Legally binding structured financing.' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'var(--color-gray-50)', padding: '0.875rem 1.15rem', borderRadius: '0.75rem', border: '1px solid var(--color-gray-200)' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>{item.title}</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--color-gray-600)' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ============ CORE VALUES GRID ============ */}
      <div className="section section-alt" style={{ padding: '5rem 0', borderTop: '1px solid var(--color-gray-200)' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeInUp}
            className="section-header text-center"
            style={{ marginBottom: '3.5rem' }}
          >
            <div className="section-divider" style={{ margin: '0 auto 0.75rem' }}></div>
            <h2 className="section-title" style={{ fontSize: '2.25rem' }}>Our Core Values</h2>
            <p className="section-subtitle mx-auto">
              The foundational principles guiding every financial solution we deliver.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}
          >
            {values.map(v => (
              <motion.div
                key={v.title}
                variants={fadeInUp}
                className="card hover-lift"
                style={{ padding: '2rem 1.75rem', background: 'white', borderRadius: '1.25rem', borderTop: '4px solid var(--color-gold)' }}
              >
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>{v.title}</h3>
                <p style={{ color: 'var(--color-gray-600)', margin: 0, fontSize: '0.95rem', lineHeight: 1.65 }}>{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
