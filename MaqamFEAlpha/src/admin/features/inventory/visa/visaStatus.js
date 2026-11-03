// Shared status vocabulary + badge styles for visa applications.
// Values follow the visa admin dashboard metric keys.
export const VISA_STATUSES = [
  { value: 'submitted', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_review', label: 'In Review' },
  { value: 'action_required', label: 'Action Required' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const badgeStyles = {
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  assigned: 'bg-sky-50 text-sky-700 border-sky-200',
  in_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  action_required: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export function visaStatusBadgeClass(status) {
  return badgeStyles[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200';
}

export function visaStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  const found = VISA_STATUSES.find((item) => item.value === normalized);
  if (found) return found.label;
  if (!normalized) return '—';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}
