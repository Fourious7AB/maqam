import {
  ShieldCheck,
  Briefcase,
  Headset,
  Building2,
  User,
  Crown,
} from 'lucide-react';

// Role keys match the CRM User Management API exactly.
export const USER_ROLES = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck, description: 'Operations administrator with user, stock and booking controls', badge: 'bg-red-100 text-red-700' },
  { value: 'super_admin', label: 'Super Admin', icon: Crown, description: 'Unrestricted platform authority', badge: 'bg-purple-100 text-purple-700' },
  { value: 'sales_agent', label: 'Sales Agent', icon: Briefcase, description: 'Leads, quotes and booking pipelines', badge: 'bg-blue-100 text-blue-700' },
  { value: 'support_agent', label: 'Support Agent', icon: Headset, description: 'Customer support personnel', badge: 'bg-sky-100 text-sky-700' },
  { value: 'hotelier', label: 'Hotelier', icon: Building2, description: 'Partner hotel manager (requires a hotel)', badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'customer', label: 'Customer', icon: User, description: 'Regular traveler account', badge: 'bg-slate-100 text-slate-700' },
];
