/**
 * financeUtils.js
 * Helpers, enums, formatters, and color mappings for CRM Finance.
 */

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'SAR', 'GBP'];

export const PAYMENT_STATUSES = [
  'paid',
  'partially_refunded',
  'refunded',
  'pending',
  'created',
  'authorized',
  'captured',
  'failed',
  'expired',
  'cancelled',
  'chargeback',
  'disputed',
];

export const REFUND_STATUSES = ['pending', 'processed', 'failed'];

export const PAYMENT_METHODS = [
  'razorpay',
  'phonepe',
  'paypal',
  'stripe',
  'bank_transfer',
];

export const BOOKING_TYPES = ['flight', 'hotel', 'package', 'offer', 'visa'];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  AED: 'AED ',
  SAR: 'SAR ',
  GBP: '£',
};

/**
 * Format monetary amount with proper currency code, symbol, and fraction digits.
 */
export function formatMoney(amount, currency = 'INR') {
  const numeric = Number(amount);
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  const curr = String(currency || 'INR').toUpperCase();

  try {
    return new Intl.NumberFormat(curr === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: safeVal % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(safeVal);
  } catch {
    const sym = CURRENCY_SYMBOLS[curr] || `${curr} `;
    return `${sym}${safeVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Visual styling descriptor for payment statuses.
 */
export function getPaymentStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'paid':
    case 'captured':
      return {
        label: 'Paid',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        variant: 'success',
      };
    case 'authorized':
      return {
        label: 'Authorized',
        bg: 'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60',
        dot: 'bg-teal-500',
        variant: 'teal',
      };
    case 'partially_refunded':
      return {
        label: 'Partial Refund',
        bg: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60',
        dot: 'bg-purple-500',
        variant: 'purple',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60',
        dot: 'bg-indigo-500',
        variant: 'indigo',
      };
    case 'pending':
    case 'created':
      return {
        label: s === 'created' ? 'Created' : 'Pending',
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        variant: 'warning',
      };
    case 'failed':
    case 'expired':
    case 'cancelled':
      return {
        label: s.charAt(0).toUpperCase() + s.slice(1),
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
        dot: 'bg-rose-500',
        variant: 'danger',
      };
    case 'chargeback':
    case 'disputed':
      return {
        label: s.charAt(0).toUpperCase() + s.slice(1),
        bg: 'bg-red-50 text-red-800 border-red-300 font-bold dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
        dot: 'bg-red-600 animate-pulse',
        variant: 'critical',
      };
    default:
      return {
        label: s || 'Unknown',
        bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
        variant: 'neutral',
      };
  }
}

/**
 * Visual styling descriptor for refund statuses.
 */
export function getRefundStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'processed':
    case 'approved':
      return {
        label: 'Processed',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        variant: 'success',
      };
    case 'pending':
      return {
        label: 'Pending Action',
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
        dot: 'bg-amber-500 animate-pulse',
        variant: 'warning',
      };
    case 'failed':
    case 'rejected':
      return {
        label: 'Failed',
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
        dot: 'bg-rose-500',
        variant: 'danger',
      };
    default:
      return {
        label: s || 'Unknown',
        bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
        variant: 'neutral',
      };
  }
}

/**
 * Friendly label & logo/color for payment methods.
 */
export function getPaymentMethodMeta(method) {
  const m = String(method || '').toLowerCase();
  switch (m) {
    case 'razorpay':
      return { name: 'Razorpay', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60' };
    case 'phonepe':
      return { name: 'PhonePe', badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/60' };
    case 'paypal':
      return { name: 'PayPal', badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60' };
    case 'stripe':
      return { name: 'Stripe', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60' };
    case 'bank_transfer':
      return { name: 'Bank Transfer', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    default:
      return { name: method || 'Unknown', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  }
}

/**
 * Format date nicely with optional time.
 */
export function formatFinanceDate(dateStr, includeTime = true) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dateFormatted = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (!includeTime) return dateFormatted;
    const timeFormatted = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  } catch {
    return String(dateStr);
  }
}
