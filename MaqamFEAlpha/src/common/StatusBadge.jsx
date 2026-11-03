import {
  CheckCircle2,
  Clock3,
  XCircle,
  BadgeCheck,
} from "lucide-react";

const statusConfig = {
  Confirmed: {
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },

  Pending: {
    icon: Clock3,
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
  },

  Cancelled: {
    icon: XCircle,
    className:
      "bg-red-50 text-red-700 ring-red-600/20",
  },

  Completed: {
    icon: BadgeCheck,
    className:
      "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
};

const StatusBadge = ({ status }) => {
  const config =
    statusConfig[status] || statusConfig.Pending;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${config.className}`}
    >
      <Icon size={14} />
      {status}
    </span>
  );
};

export default StatusBadge;