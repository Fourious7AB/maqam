export function formatDate(value, options = {}) {
  if (!value) return '-';
  const raw = typeof value === 'object' && value !== null && value.$date ? value.$date : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '-';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}
