import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, FileText, Building2, ClipboardCheck, CreditCard,
  ArrowRight, ShieldCheck, CheckCircle2, Award, FileCheck, Target, Handshake, TrendingUp
} from 'lucide-react';

const services = [
  { icon: BookOpen,    title: 'Business ITR Filing',   desc: 'Comprehensive income tax return filing for proprietorships, partnerships, LLPs, and private limited companies. We ensure maximum compliance and tax optimization.', image: '/service_business_itr.png' },
  { icon: Users,       title: 'Salary ITR & Planning', desc: 'Expert tax planning and ITR filing for salaried individuals. We help you structure your salary to minimize tax liability legally.', image: '/service_salary_itr.png' },
  { icon: FileText,    title: 'TDS Return & Compliance',desc: 'Timely calculation, deduction, and filing of quarterly TDS returns. Complete management of Form 16/16A generation and Traces compliance.', image: '/service_tds_return.png' },
  { icon: Building2,   title: 'GST Registration & Filing',desc: 'End-to-end Goods and Services Tax solutions including new registration, monthly/quarterly return filing (GSTR-1, GSTR-3B), and annual reconciliations.', image: '/service_gst_filing.png' },
  { icon: ClipboardCheck, title: 'Audit & Certifications',desc: 'Statutory audits, tax audits, internal audits, and required CA certifications for bank loans and regulatory compliance.', image: '/service_audit_cert.png' },
  { icon: CreditCard,  title: 'Easy Digital Loans',       desc: 'Seamless, hassle-free digital loan application, fast processing, instant agreement workflow, and structured repayment scheduling.', image: '/service_easy_loans.png' },
];

const requiredDocs = [
  'Aadhaar Card',
  'PAN Card',
  'Bank Passbook Front Page',
  'Email ID & Mobile Number',
  'Business Name with Address Proof',
  'Bank Statement (01-04-2025 to 31-03-2026)',
];

const pillars = [
  { icon: ShieldCheck, title: 'Expert Advice', desc: 'Certified professionals guiding your tax & financial decisions.' },
  { icon: Target,      title: 'Accurate & Timely', desc: 'Strict compliance timelines to prevent interest or penalties.' },
  { icon: Handshake,   title: 'Transparent Process', desc: 'No hidden fees or complex jargon. Complete clarity at every step.' },
  { icon: TrendingUp,  title: 'Your Growth Priority', desc: 'Tailored financial solutions designed to help your business scale.' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

export default function ServicesPage() {
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
          variants={staggerContainer}
          className="container" 
          style={{ position: 'relative', zIndex: 2 }}
        >
          <motion.div variants={fadeInUp} className="hero-badge float-slow" style={{ margin: '0 auto 1.25rem', display: 'inline-flex' }}>
            <Award size={15} />
            MasterMind Group Company
          </motion.div>
          <motion.h1 variants={fadeInUp} style={{ fontSize: '3.25rem', fontWeight: 900, color: 'white', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Our Financial Services
          </motion.h1>
          <motion.p variants={fadeInUp} style={{ color: 'var(--color-gold-light)', fontSize: '1.2rem', fontWeight: 600, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Professional audit, tax compliance, GST filing, and easy digital loan solutions designed to help you and your business thrive.
          </motion.p>
        </motion.div>
      </div>

      {/* ============ SERVICES GRID ============ */}
      <div className="section container">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeInUp}
          className="section-header text-center" 
          style={{ marginBottom: '3.5rem' }}
        >
          <div className="section-divider" style={{ margin: '0 auto 0.75rem' }}></div>
          <h2 className="section-title" style={{ fontSize: '2.25rem' }}>Comprehensive Solutions</h2>
          <p className="section-subtitle mx-auto">
            Everything you need for seamless compliance, tax savings, and structured financing.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="services-grid" 
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}
        >
          {services.map(({ icon: Icon, title, desc, image }) => (
            <motion.div 
              key={title} 
              variants={fadeInUp}
              className="service-card hover-lift" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'white', 
                border: '1px solid var(--color-gray-200)', 
                borderRadius: '1.25rem', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Card Image Cover */}
              <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={image || '/service_card.png'} 
                  alt={title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.95 }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(13,45,26,0.65))' }} />
                
                {/* Floating Icon */}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-1.25rem', 
                  left: '1.5rem', 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '0.85rem', 
                  background: 'var(--color-primary)', 
                  color: 'var(--color-gold-light)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  boxShadow: '0 8px 24px rgba(13,45,26,0.3)',
                  border: '2px solid var(--color-white)',
                  zIndex: 10
                }}>
                  <Icon size={26} />
                </div>
              </div>

              {/* Card Content */}
              <div style={{ padding: '2.5rem 1.5rem 2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--color-primary-dark)', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.65, marginBottom: '2rem', fontSize: '0.95rem', flex: 1 }}>
                  {desc}
                </p>
                <div>
                  <a 
                    href="https://wa.me/919865682992?text=Hello%20K-CUBE,%20I%20am%20interested%20in%20your%20services." 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      fontWeight: 700, 
                      fontSize: '0.875rem',
                      borderRadius: '0.625rem',
                      padding: '0.6rem 1.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    Inquire Now <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ============ DOCUMENTS REQUIRED SHOWCASE ============ */}
      <div className="section section-alt" style={{ borderTop: '1px solid var(--color-gray-200)', borderBottom: '1px solid var(--color-gray-200)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
            
            {/* Banner Showcase Image */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={fadeInUp}
              className="banner-frame float-slow"
            >
              <img 
                src="/banner_documents.jpg" 
                alt="Documents Required for Tax & Loan Services - K-CUBE Audit & FinServ" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            </motion.div>

            {/* Content Details */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="badge badge-gold" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}>
                <FileCheck size={14} /> Quick Checklist
              </motion.div>
              <motion.h2 variants={fadeInUp} style={{ fontSize: '2.35rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                Documents Required for Services
              </motion.h2>
              <motion.p variants={fadeInUp} style={{ color: 'var(--color-gray-600)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Keep these essential documents ready to expedite your Income Tax Return filing, GST registration, audit certification, or loan agreement processing.
              </motion.p>

              <motion.div variants={fadeInUp} style={{ display: 'grid', gap: '0.875rem', marginBottom: '2.5rem' }}>
                {requiredDocs.map(doc => (
                  <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'white', padding: '0.75rem 1.15rem', borderRadius: '0.75rem', border: '1px solid var(--color-gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>{doc}</span>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeInUp} className="flex gap-3 flex-wrap">
                <Link to="/contact" className="btn btn-primary btn-lg">
                  Submit Documents Now <ArrowRight size={18} />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ============ 4 PILLARS GRID ============ */}
      <div className="section container" style={{ padding: '5rem 1.5rem' }}>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeInUp}
          className="section-header text-center" 
          style={{ marginBottom: '3.5rem' }}
        >
          <div className="section-divider" style={{ margin: '0 auto 0.75rem' }}></div>
          <h2 className="section-title" style={{ fontSize: '2.25rem' }}>Why Clients Trust K-CUBE</h2>
          <p className="section-subtitle mx-auto">
            Built on core principles of accuracy, legal compliance, and customer-first service.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.75rem' }}
        >
          {pillars.map(({ icon: Icon, title, desc }) => (
            <motion.div 
              key={title} 
              variants={fadeInUp}
              className="card hover-lift" 
              style={{ padding: '2rem 1.5rem', textAlign: 'center', borderTop: '4px solid var(--color-gold)', borderRadius: '1.25rem' }}
            >
              <div style={{ width: 58, height: 58, borderRadius: '1rem', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--color-primary)' }}>
                <Icon size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ color: 'var(--color-gray-600)', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
