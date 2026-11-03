import { getPaymentStatusMeta, getRefundStatusMeta } from "../financeUtils";

export function PaymentStatusBadge({ status, className = "" }) {
  const meta = getPaymentStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize ${meta.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function RefundStatusBadge({ status, className = "" }) {
  const meta = getRefundStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize ${meta.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
