import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Briefcase,
  TrendingUp,
  Package,
  ClipboardList,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Globe2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../store/authContext";
import { useData } from "../../store/dataContext";

export default function SalesmanLayout() {
  const { user, switchRole, logout } = useAuth();
  const { getSalesmanStats } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const salesmanId = user?.id || "SM-3001";
  const salesmanName = user?.name || "Sales Consultant";
  const stats = getSalesmanStats(salesmanId);

  const navItems = [
    { label: "Overview", to: "/salesman", icon: TrendingUp, end: true },
    { label: "Book Package for Customer", to: "/salesman/book-package", icon: Package },
    { label: "Customer Bookings", to: "/salesman/bookings", icon: ClipboardList },
    { label: "Customer CRM / History", to: "/salesman/customers", icon: Users },
    { label: "Account Profile", to: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f0f5ff] text-slate-900 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      {/* Salesman Blue Sidebar */}
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#0b192c] text-white shadow-2xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand */}
          <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5 bg-[#091524]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-md">
                <Briefcase size={20} />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white">Maqam</div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-blue-400">
                  Salesman Portal
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Salesman Profile Badge */}
          <div className="m-3.5 rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-900/40 to-blue-950/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white shadow">
                {user?.photo ? (
                  <img src={user.photo} alt={salesmanName} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  salesmanName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-xs truncate">{salesmanName}</div>
                <div className="font-mono text-[10px] text-blue-300 font-semibold">ID: {salesmanId}</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
              Sales Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-blue-100/80 hover:bg-white/[0.08] hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Quick Action */}
          <div className="p-3.5">
            <Link
              to="/salesman/book-package"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-blue-500 hover:to-indigo-500"
            >
              <Plus size={16} /> Book New Package
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Header */}
          <header className="flex h-[72px] items-center justify-between border-b border-blue-100 bg-white px-4 sm:px-6 lg:px-8 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                  Salesman Workspace
                </h1>
                <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
                  Personalized packages, multi-traveler booking, and real-time approval tracking.
                </p>
              </div>
            </div>

            {/* Right Tools & Role Switcher */}
            <div className="flex items-center gap-3">
              {/* Dev Role Switcher */}
              <div className="hidden items-center gap-1 rounded-xl bg-blue-50 p-1 text-[11px] font-semibold sm:flex">
                <span className="px-2 text-slate-500">Role:</span>
                <button
                  type="button"
                  onClick={() => switchRole("admin")}
                  className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-white shadow-xs"
                >
                  Salesman
                </button>
                <button
                  type="button"
                  onClick={() => switchRole("customer")}
                  className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => switchRole("hotelier")}
                  className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  Hotelier
                </button>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-xs">
                  {salesmanName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden text-left text-xs sm:block">
                  <div className="font-bold text-slate-900 truncate max-w-[120px]">{salesmanName}</div>
                  <div className="text-[10px] text-blue-600 font-semibold">{salesmanId}</div>
                </div>
              </Link>
            </div>
          </header>

          {/* Main Workspace Body */}
          <main className="mx-auto w-full max-w-[1550px] flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
