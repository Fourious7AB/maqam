import { NavLink } from "react-router-dom";

import {
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  Globe2,
  Home,
  Hotel,
  MessageSquare,
  Package,
  Plane,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

// Grouped navigation. Every item links to a real route (wired in App.jsx),
// so the sidebar actually navigates and highlights the active page.
const groups = [
  {
    title: "SALES",
    items: [
      { label: "Sales Overview", to: "/sales/overview", icon: TrendingUp },
      { label: "Salesmen", to: "/sales/salesmen", icon: Briefcase },
    ],
  },
  {
    title: "BOOKINGS",
    items: [
      { label: "Bookings Approval", to: "/bookings/list", icon: ClipboardList },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { label: "Customers", to: "/customers", icon: Users },
      { label: "Hoteliers", to: "/hoteliers", icon: Building2 },
      { label: "Salesmen", to: "/people/salesmen", icon: UserCheck },
      { label: "Create Account", to: "/accounts/new", icon: UserPlus },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Flights", to: "/flights", icon: Plane },
      { label: "Hotels", to: "/hotels", icon: Hotel },
      { label: "Packages", to: "/packages", icon: Package },
      { label: "Cabs", to: "/cabs", icon: Car },
      { label: "Meals", to: "/meals", icon: Utensils },
      { label: "Visa", to: "/visa", icon: Globe2 },
    ],
  },
  {
    title: "MONEY",
    items: [
      { label: "Price Control", to: "/pricing", icon: Tag },
      { label: "Invoices", to: "/invoices", icon: Receipt },
      { label: "Payments", to: "/payments", icon: WalletCards },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Enquiries", to: "/enquiries", icon: MessageSquare },
      { label: "Users", to: "/users", icon: ShieldCheck },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

const itemBase =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition";

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col bg-[#06213b] text-white shadow-2xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600">
              <Globe2 size={22} />
            </div>
            <div>
              <div className="text-[20px] font-bold tracking-tight">Maqam</div>
              <div className="text-[10px] text-slate-300">Admin Console</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1 text-slate-300 hover:bg-white/10 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `${itemBase} mb-5 font-semibold ${
                isActive ? "bg-blue-600 text-white" : "bg-white/[0.06] text-white hover:bg-white/10"
              }`
            }
          >
            <Home size={17} />
            <span>Dashboard</span>
          </NavLink>

          {groups.map((group) => (
            <div key={group.title} className="mb-5">
              <div className="px-3 pb-2 text-[10px] font-semibold tracking-wide text-slate-400">
                {group.title}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const { label, to, icon: Icon } = item;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      end
                      className={({ isActive }) =>
                        `${itemBase} ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-200 hover:bg-white/10"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={17} className={`shrink-0 ${isActive ? "text-white" : "text-slate-300"}`} />
                          <span className="flex-1">{label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick action */}
        <div className="m-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-1 text-sm font-semibold">Quick Booking</div>
          <p className="mb-3 text-[11px] leading-5 text-slate-300">
            Create a new booking for a Makkah or Madinah customer.
          </p>
          <NavLink
            to="/bookings/new"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold transition hover:bg-blue-500"
          >
            <Plus size={15} />
            New Booking
          </NavLink>
        </div>
      </aside>
    </>
  );
}
