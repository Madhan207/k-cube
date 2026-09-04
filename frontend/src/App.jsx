import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import BorrowerLayout from './layouts/BorrowerLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ServicesPage from './pages/public/ServicesPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBorrowers from './pages/admin/AdminBorrowers';
import AdminCreateBorrower from './pages/admin/AdminCreateBorrower';
import AdminBorrowerDetail from './pages/admin/AdminBorrowerDetail';
import AdminKYC from './pages/admin/AdminKYC';
import AdminLoans from './pages/admin/AdminLoans';
import AdminLoanDetail from './pages/admin/AdminLoanDetail';
import AdminCreateLoan from './pages/admin/AdminCreateLoan';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAgreements from './pages/admin/AdminAgreements';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';

// Borrower Pages
import BorrowerDashboard from './pages/borrower/BorrowerDashboard';
import BorrowerProfile from './pages/borrower/BorrowerProfile';
import BorrowerKYC from './pages/borrower/BorrowerKYC';
import BorrowerLoans from './pages/borrower/BorrowerLoans';
import BorrowerApplyLoan from './pages/borrower/BorrowerApplyLoan';
import BorrowerLoanDetail from './pages/borrower/BorrowerLoanDetail';
import BorrowerPayments from './pages/borrower/BorrowerPayments';
import BorrowerAgreements from './pages/borrower/BorrowerAgreements';
import BorrowerDocuments from './pages/borrower/BorrowerDocuments';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: 0 },
  },
});

function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireBorrower({ children }) {
  const { isAuthenticated, isBorrower, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isBorrower) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
            </Route>

            {/* Auth Routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password/:uid/:token" element={<ResetPasswordPage />} />

            {/* Borrower Routes */}
            <Route path="dashboard" element={
              <RequireBorrower><BorrowerLayout /></RequireBorrower>
            }>
              <Route index element={<BorrowerDashboard />} />
              <Route path="profile" element={<BorrowerProfile />} />
              <Route path="kyc" element={<BorrowerKYC />} />
              <Route path="loans" element={<BorrowerLoans />} />
              <Route path="loans/:id" element={<BorrowerLoanDetail />} />
              <Route path="apply" element={<BorrowerApplyLoan />} />
              <Route path="apply-loan" element={<BorrowerApplyLoan />} />
              <Route path="payments" element={<BorrowerPayments />} />
              <Route path="agreements" element={<BorrowerAgreements />} />
              <Route path="documents" element={<BorrowerDocuments />} />
            </Route>

            {/* Admin Routes */}
            <Route path="admin" element={
              <RequireAuth adminOnly><AdminLayout /></RequireAuth>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="borrowers" element={<AdminBorrowers />} />
              <Route path="borrowers/create" element={<AdminCreateBorrower />} />
              <Route path="borrowers/:id" element={<AdminBorrowerDetail />} />
              <Route path="kyc" element={<AdminKYC />} />
              <Route path="loans" element={<AdminLoans />} />
              <Route path="loans/create" element={<AdminCreateLoan />} />
              <Route path="loans/:id" element={<AdminLoanDetail />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="agreements" element={<AdminAgreements />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="apply" element={<Navigate to="/dashboard/apply" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: { iconTheme: { primary: '#1a4a2e', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
