import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Percent,
  Receipt,
  Building2,
  TicketCheck,
  BellRing,
  FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader';
import DataSourceBadge from '../../../components/common/DataSourceBadge';

const SETTINGS_TABS = [
  {
    to: '/admin/settings/markup',
    label: 'Commercial Markup',
    icon: Percent,
    badge: 'Margin',
  },
  {
    to: '/admin/settings/agency-gst',
    label: 'Agency GST (5%)',
    icon: Receipt,
    badge: 'Tax',
  },
  {
    to: '/admin/settings/general',
    label: 'General Company',
    icon: Building2,
    badge: 'Core',
  },
  {
    to: '/admin/settings/booking',
    label: 'Booking Policies',
    icon: TicketCheck,
    badge: 'Policy',
  },
  {
    to: '/admin/settings/notifications',
    label: 'Notifications',
    icon: BellRing,
    badge: 'Alerts',
  },
  {
    to: '/admin/settings/invoices',
    label: 'Tax & Invoicing',
    icon: FileSpreadsheet,
    badge: 'SAC',
  },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Policies"
        subtitle="Manage commercial markup percentages, statutory Agency Personal GST (5%), company policies, and notification channels."
        actions={<DataSourceBadge mockCapable={false} />}
      />

      {/* Navigation Sub-Tabs */}
      <div className="relative">
        <nav
          className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none sm:gap-2 border-b border-slate-200 dark:border-slate-800"
          aria-label="Settings Tabs"
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                }`}
              >
                <Icon
                  size={16}
                  className={`transition ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-800/80 text-emerald-100 dark:bg-emerald-700 dark:text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area */}
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
