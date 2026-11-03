import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Info
} from 'lucide-react';

const statusConfig = {
  confirmed: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
  },
  pending: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: Clock,
  },
  rejected: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: XCircle,
  },
  processing: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: Info,
  },
  cancelled: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    icon: AlertCircle,
  },
};

export default function StatusBadge({
  status = 'pending',
  text = null,
  size = 'md'
}) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <div className={`flex items-center rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]} font-medium`}>
      <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      <span>{text || status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </div>
  );
}
