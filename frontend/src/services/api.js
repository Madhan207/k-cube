import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://k-cube.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const tokenStorage = {
  getAccess: () => sessionStorage.getItem('access_token') || localStorage.getItem('access_token'),
  getRefresh: () => sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token'),
  setTokens: (access, refresh, remember = false) => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    if (remember) {
      localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
    } else {
      sessionStorage.setItem('access_token', access);
      if (refresh) sessionStorage.setItem('refresh_token', refresh);
    }
  },
  clear: () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

// ---- Auth Token Injection ----
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ---- Token Refresh on 401 ----
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => { refreshSubscribers.forEach((cb) => cb(token)); refreshSubscribers = []; };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refresh = tokenStorage.getRefresh();
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
        tokenStorage.setTokens(data.access, refresh);
        onRefreshed(data.access);
        isRefreshing = false;
        originalRequest.headers['Authorization'] = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Auth Services ----
export const authService = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/register/', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp/', { email, otp }),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  profile: () => api.get('/auth/profile/'),
  changePassword: (data) => api.post('/auth/change-password/', data),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  validateResetToken: (uid, token) => api.post('/auth/reset-password/validate/', { uid, token }),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
};

// ---- Borrower Services ----
export const borrowerService = {
  list: (params) => api.get('/borrowers/', { params }),
  get: (id) => api.get(`/borrowers/${id}/`),
  create: (data) => api.post('/borrowers/', data),
  update: (id, data) => api.patch(`/borrowers/${id}/`, data),
  suspend: (id) => api.post(`/borrowers/${id}/suspend/`),
  reactivate: (id) => api.post(`/borrowers/${id}/reactivate/`),
  loans: (id) => api.get(`/borrowers/${id}/loans/`),
  kycStatus: (id) => api.get(`/borrowers/${id}/kyc_status/`),
};

// ---- KYC Services ----
export const kycService = {
  profile: (borrowerId) => api.get(`/kyc/${borrowerId}/`),
  verifyPan: (data) => api.post('/kyc/verify/pan/', data),
  verifyPAN: (data) => api.post('/kyc/verify/pan/', data),
  verifyAadhaar: (data) => api.post('/kyc/verify/aadhaar/initiate/', data),
  initiateAadhaar: (data) => api.post('/kyc/verify/aadhaar/initiate/', data),
  verifyAadhaarOTP: (data) => api.post('/kyc/verify/aadhaar/otp/', data),
  requestReview: (borrowerId) => api.post(`/kyc/${borrowerId}/request-review/`),
  adminAction: (borrowerId, data) => api.post(`/kyc/${borrowerId}/admin-action/`, data),
  listAll: (params) => api.get('/kyc/', { params }),
};

// ---- Document Services ----
export const documentService = {
  list: (params) => api.get('/documents/', { params }),
  upload: (formData) => api.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  download: (id) => api.get(`/documents/${id}/download/`, { responseType: 'blob' }),
};

// ---- Loan Services ----
export const loanService = {
  list: (params) => api.get('/loans/', { params }),
  get: (id) => api.get(`/loans/${id}/`),
  create: (data) => api.post('/loans/', data),
  update: (id, data) => api.patch(`/loans/${id}/`, data),
  calculate: (id) => api.post(`/loans/${id}/calculate/`),
  schedule: (id) => api.get(`/loans/${id}/schedule/`),
  approve: (id) => api.post(`/loans/${id}/approve/`),
  decline: (id) => api.post(`/loans/${id}/reject/`),
  preview: (data) => api.post('/loans/calculate-preview/', data),
};

// ---- Agreement Services ----
export const agreementService = {
  list: (params) => api.get('/agreements/', { params }),
  get: (id) => api.get(`/agreements/${id}/`),
  generate: (loanId) => api.post('/agreements/', { loan_id: loanId }),
  preview: (id) => api.get(`/agreements/${id}/preview/`),
  downloadPDF: (id) => api.get(`/agreements/${id}/download_pdf/`, { responseType: 'blob' }),
  downloadDOCX: (id) => api.get(`/agreements/${id}/download_docx/`, { responseType: 'blob' }),
};

// ---- Payment Services ----
export const paymentService = {
  schedules: (params) => api.get('/payments/schedules/', { params }),
  history: (params) => api.get('/payments/history/', { params }),
  record: (data) => api.post('/payments/record/', data),
};

// ---- Audit Services ----
export const auditService = {
  list: (params) => api.get('/audit-logs/', { params }),
};

// ---- Lender Services ----
export const lenderService = {
  list: () => api.get('/lenders/'),
  update: (id, data) => api.patch(`/lenders/${id}/`, data),
};

// ---- Admin Stats ----
export const adminService = {
  dashboard: () => api.get('/borrowers/?page_size=1').then(() => Promise.all([
    api.get('/borrowers/'),
    api.get('/loans/?status=ACTIVE'),
    api.get('/payments/schedules/?status=OVERDUE'),
    api.get('/kyc/?overall_status=PENDING_REVIEW'),
  ])).catch(() => ({ data: {} })),
};
