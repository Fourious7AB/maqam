// Flexible status badge shared across hotelier pages.
// Covers booking, payment, invoice, enquiry, inventory and availability states.

const STATUS_STYLES = {
  // positive / success
  Active: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Confirmed: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Completed: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Paid: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Converted: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Available: "bg-emerald-50 text-emerald-600 ring-emerald-100",

  // pending / warning
  Pending: "bg-amber-50 text-amber-600 ring-amber-100",
  Unpaid: "bg-amber-50 text-amber-600 ring-amber-100",
  Contacted: "bg-amber-50 text-amber-600 ring-amber-100",
  Limited: "bg-amber-50 text-amber-600 ring-amber-100",

  // info / neutral-active
  New: "bg-blue-50 text-blue-600 ring-blue-100",

  // negative / danger
  Cancelled: "bg-red-50 text-red-500 ring-red-100",
  Failed: "bg-red-50 text-red-500 ring-red-100",
  Overdue: "bg-red-50 text-red-500 ring-red-100",
  Inactive: "bg-slate-100 text-slate-500 ring-slate-200",
  Refunded: "bg-slate-100 text-slate-500 ring-slate-200",
  Closed: "bg-slate-100 text-slate-500 ring-slate-200",
  "Sold Out": "bg-red-50 text-red-500 ring-red-100",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-500 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
