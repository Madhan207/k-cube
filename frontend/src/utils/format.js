/**
 * utils/format.js — Indian currency, date, and number formatting utilities
 */

export function formatCurrency(amount, options = {}) {
  if (amount === null || amount === undefined) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
}

export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
      ...options,
    });
  } catch { return dateStr; }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  return `${parseFloat(value).toFixed(2)}%`;
}

export function maskPAN(pan) {
  if (!pan || pan.length < 10) return pan;
  return pan.substring(0, 5) + '****' + pan.slice(-1);
}

export function maskAadhaar(aadhaar) {
  if (!aadhaar) return '—';
  const clean = aadhaar.replace(/\s/g, '');
  return 'XXXX XXXX ' + clean.slice(-4);
}

export function maskMobile(mobile) {
  if (!mobile || mobile.length < 7) return '—';
  return mobile.substring(0, 3) + '****' + mobile.slice(-3);
}

export const KYC_STATUS_MAP = {
  NOT_STARTED: { label: 'Not Started', cls: 'badge-gray' },
  IN_PROGRESS: { label: 'In Progress', cls: 'badge-warning' },
  DOCUMENT_REQUIRED: { label: 'Docs Required', cls: 'badge-warning' },
  PENDING_REVIEW: { label: 'Pending Review', cls: 'badge-info' },
  VERIFIED: { label: 'Verified', cls: 'badge-success' },
  REJECTED: { label: 'Rejected', cls: 'badge-danger' },
  EXPIRED: { label: 'Expired', cls: 'badge-danger' },
};

export const LOAN_STATUS_MAP = {
  DRAFT: { label: 'Draft', cls: 'badge-gray' },
  ACTIVE: { label: 'Active', cls: 'badge-success' },
  CLOSED: { label: 'Closed', cls: 'badge-primary' },
  DEFAULTED: { label: 'Defaulted', cls: 'badge-danger' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-danger' },
  PENDING_APPROVAL: { label: 'Pending Approval', cls: 'badge-warning' },
};

export const PAYMENT_STATUS_MAP = {
  UPCOMING: { label: 'Upcoming', cls: 'badge-gray' },
  DUE: { label: 'Due', cls: 'badge-warning' },
  PAID: { label: 'Paid', cls: 'badge-success' },
  PARTIALLY_PAID: { label: 'Partially Paid', cls: 'badge-info' },
  OVERDUE: { label: 'Overdue', cls: 'badge-danger' },
  WAIVED: { label: 'Waived', cls: 'badge-primary' },
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
