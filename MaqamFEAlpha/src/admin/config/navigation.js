import {
  LayoutDashboard, UsersRound, GitBranch, FileText, Package, PackageSearch,
  Plane, Hotel, TicketCheck, CalendarDays, UserRound,
  WalletCards, Settings, ShieldCheck, Layers3, Tag, Plus,
  ArrowUpRight, RotateCcw, Image as ImageIcon,
  Percent, Receipt, Building2, BellRing, FileSpreadsheet,
} from 'lucide-react';

// Single source of truth for admin navigation. The sidebar renders it and
// the dashboard quick-search reuses it so both always stay in sync.
// Every section renders as a main sidebar option; sections with more than
// one item expand/collapse their sub-items on click (see Sidebar.jsx).
export const sidebarSections = [
  { label: 'Overview', icon: LayoutDashboard, basePath: ['/admin/dashboard'], items: [{ label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard }] },
  { label: 'Leads & Sales', icon: UsersRound, basePath: ['/admin/leads', '/admin/pipeline', '/admin/quotes', '/admin/crm'], items: [{ label: 'All Leads', to: '/admin/leads', icon: UsersRound }, { label: 'Pipeline', to: '/admin/pipeline', icon: GitBranch }, { label: 'Quotations', to: '/admin/quotes', icon: FileText }, { label: 'CRM Workspace', to: '/admin/crm/overview', icon: LayoutDashboard }] },
  { label: 'Packages', icon: Package, basePath: ['/admin/packages'], items: [{ label: 'All Packages', to: '/admin/packages', icon: Package }, { label: 'Custom Package', to: '/admin/packages/custom', icon: PackageSearch }] },
  { label: 'Retail Offers', icon: Tag, basePath: ['/admin/offers'], items: [{ label: 'Retail Offers', to: '/admin/offers', icon: Tag }] },
  {
    label: 'Inventory',
    icon: Layers3,
    basePath: ['/admin/inventory/flights', '/admin/inventory/hotels', '/admin/inventory/cars', '/admin/inventory/insurance'],
    items: [
      { label: 'Flights', to: '/admin/inventory/flights', icon: Plane },
      { label: 'Hotels', to: '/admin/inventory/hotels', icon: Hotel },
      { label: 'Hotel Stock', to: '/admin/inventory/hotels/stock', icon: Layers3 },
      { label: 'Stock Approvals', to: '/admin/inventory/hotels/pending', icon: TicketCheck },
      { label: 'Approved Stock', to: '/admin/inventory/hotels/approved', icon: TicketCheck },
    ],
  },
  {
    label: 'Visa',
    icon: TicketCheck,
    basePath: ['/admin/visa', '/admin/inventory/visa'],
    items: [
      { label: 'Visa Dashboard', to: '/admin/visa/dashboard', icon: TicketCheck },
      { label: 'Visa Catalogue', to: '/admin/inventory/visa', icon: TicketCheck },
      { label: 'Visa Applications', to: '/admin/visa/applications', icon: FileText },
      { label: 'Visa Groups', to: '/admin/visa/groups', icon: UserRound },
      { label: 'Visa Case Officers', to: '/admin/visa/case-officers', icon: ShieldCheck },
    ],
  },
  { label: 'Bookings', icon: CalendarDays, basePath: ['/admin/bookings'], items: [{ label: 'All Bookings', to: '/admin/bookings', icon: CalendarDays }, { label: 'Book a Service', to: '/admin/bookings/create-service', icon: Plus }] },
  { label: 'Customers & Staff', icon: UserRound, basePath: ['/admin/customers', '/admin/users'], items: [{ label: 'Customers', to: '/admin/customers', icon: UserRound }, { label: 'Users & Staff', to: '/admin/users', icon: ShieldCheck }] },
  {
    label: 'Finance',
    icon: WalletCards,
    basePath: ['/admin/finance'],
    items: [
      { label: 'Overview', to: '/admin/finance', icon: WalletCards },
      { label: 'Transactions', to: '/admin/finance/transactions', icon: ArrowUpRight },
      { label: 'Invoices & Billing', to: '/admin/finance/invoices', icon: Receipt },
      // { label: 'Refunds', to: '/admin/finance/refunds', icon: RotateCcw }, // Commented out per user request
    ],
  },
  {
    label: 'System',
    icon: Settings,
    basePath: ['/admin/settings'],
    items: [
      { label: 'Commercial Markup', to: '/admin/settings/markup', icon: Percent },
      { label: 'Agency GST (5%)', to: '/admin/settings/agency-gst', icon: Receipt },
      { label: 'General Company', to: '/admin/settings/general', icon: Building2 },
      { label: 'Booking Policies', to: '/admin/settings/booking', icon: TicketCheck },
      { label: 'Notifications', to: '/admin/settings/notifications', icon: BellRing },
      { label: 'Tax & Invoicing', to: '/admin/settings/invoices', icon: FileSpreadsheet },
    ],
  },
];

