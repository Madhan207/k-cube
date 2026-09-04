import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success('Your message has been sent successfully. We will get back to you soon.');
      e.target.reset();
      setLoading(false);
    }, 1000);
  };

  return (
    <div>
      <div 
        className="section section-dark text-center" 
        style={{ 
          padding: '7.5rem 1.5rem 4.5rem',
          backgroundImage: 'linear-gradient(rgba(13, 45, 26, 0.88), rgba(13, 45, 26, 0.98)), url("/service_header.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 variants={fadeInUp} style={{ fontSize: '3rem', fontWeight: 900, color: 'white', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Contact Us</motion.h1>
          <motion.p variants={fadeInUp} style={{ color: 'var(--color-gold-light)', fontSize: '1.25rem', fontWeight: 600, maxWidth: 600, margin: '0 auto' }}>
            Have questions about our services or need assistance with your loan? We're here to help.
          </motion.p>
        </motion.div>
      </div>

      <div className="section container">
        <div className="contact-grid">
          
          {/* Contact Info */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>Get in Touch</motion.h2>
            <motion.p variants={fadeInUp} style={{ color: 'var(--color-gray-600)', marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '1rem' }}>
              Our expert team at K-CUBE Audit & FinServ is ready to assist you with ITR filing, GST compliance, or custom easy digital loan solutions.
            </motion.p>
            
            <motion.div variants={fadeInUp} style={{ display: 'grid', gap: '2rem' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  transition: 'transform 200ms ease, background 200ms ease'
                }}
                className="hover-lift"
              >
                <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--color-gold-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-gold-dark)', transition: 'transform 200ms ease' }}>
                  <MapPin size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Office Location
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-dark)', background: 'var(--color-gold-50)', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontWeight: 700, border: '1px solid rgba(184,134,0,0.2)' }}>
                      KVS Complex, Kalipatti
                    </span>
                  </h4>
                  <div 
                    style={{ 
                      borderRadius: '1.25rem', 
                      overflow: 'hidden', 
                      border: '1px solid var(--color-gray-200)', 
                      boxShadow: '0 12px 32px rgba(13, 45, 26, 0.08)',
                      position: 'relative'
                    }}
                  >
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d250199.2221788764!2d77.65727318671875!3d11.525808100000006!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babe1066c692695%3A0x4c8deae73190607a!2sKVS%20Complex!5e0!3m2!1sen!2sin!4v1787298361496!5m2!1sen!2sin" 
                      width="100%" 
                      height="260" 
                      style={{ border: 0, display: 'block' }} 
                      allowFullScreen="" 
                      loading="lazy" 
                      referrerPolicy="strict-origin-when-cross-origin"
                      title="KVS Complex Google Map Location"
                    />
                  </div>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  transition: 'transform 200ms ease, background 200ms ease'
                }}
                className="hover-lift"
              >
                <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)', transition: 'transform 200ms ease' }}>
                  <Phone size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>Phone Number</h4>
                  <a href="tel:+919865682992" style={{ color: 'var(--color-primary)', fontWeight: 700, transition: 'color 200ms ease' }}>+91 98656 82992</a>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  transition: 'transform 200ms ease, background 200ms ease'
                }}
                className="hover-lift"
              >
                <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)', transition: 'transform 200ms ease' }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>Email Address</h4>
                  <a href="mailto:hrkcube@gmail.com" style={{ color: 'var(--color-primary)', fontWeight: 700, transition: 'color 200ms ease' }}>hrkcube@gmail.com</a>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeInUp}
            className="card" 
            style={{ borderRadius: '1.25rem', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}
          >
            <div className="card-body" style={{ padding: '2.25rem 2rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--color-primary-dark)' }}>Send us a Message</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" placeholder="Enter your full name" required />
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" placeholder="your@email.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input type="tel" className="form-control" placeholder="+91 xxxxx xxxxx" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Inquiry Type</label>
                  <select className="form-control" required>
                    <option value="">Select an option</option>
                    <option value="ITR">Income Tax / ITR</option>
                    <option value="GST">GST Registration & Filing</option>
                    <option value="AUDIT">Audit Services</option>
                    <option value="LOAN">Easy Digital Loan</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Your Message</label>
                  <textarea className="form-control" rows={4} placeholder="How can we help you?" required></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading} style={{ padding: '0.85rem' }}>
                  {loading ? <span className="spinner" /> : <Send size={16} />}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
