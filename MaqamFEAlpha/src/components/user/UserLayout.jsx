import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Globe2,
  Package,
  Calendar,
  Clock,
  User,
  Users,
  Hotel,
  Plane,
  Car,
  Utensils,
  Menu,
  X,
  Sparkles,
  History,
  Home,
  CheckCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../store/authContext";
import LogOutPopModal from "../LogOutPopModal";

export default function UserLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userName = user?.name || "Abdul Rahman";
  const userId = user?.id || "CU-4001";

  const navItems = [
    { label: "Dashboard", to: "/user", icon: Home, end: true },
    { label: "Custom Travel Packages", to: "/user/custom-package", icon: Package },
    { label: "My Bookings", to: "/profile?tab=my-bookings", icon: Calendar },
    { label: "Saved Travelers", to: "/user/travelers", icon: Users },
    { label: "Hotels", to: "/hotel-page", icon: Hotel },
    { label: "Flights", to: "/flight", icon: Plane },
    { label: "Cabs", to: "/cab-bookng-form", icon: Car },
    { label: "Meals & Food", to: "/food", icon: Utensils },
    { label: "Visa Services", to: "/visa-card", icon: Globe2 },
    { label: "Account & Profile", to: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      <div className="flex min-h-screen">
        {/* User Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="flex h-[72px] items-center justify-between border-b border-slate-800 px-5 bg-slate-950">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-md">
                <Globe2 size={22} />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white">Maqam</div>
                <div className="text-[10px] font-semibold text-blue-400">Traveler Hub</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Pill */}
          <div className="m-3.5 rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white shadow">
                {user?.photo ? (
                  <img src={user.photo} alt={userName} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  userName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-xs truncate">{userName}</div>
                <div className="font-mono text-[10px] text-blue-400">ID: {userId}</div>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Traveler Workspace
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
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Quick CTA & Log Out in Sidebar */}
          <div className="p-3.5 space-y-2 border-t border-slate-800">
            <Link
              to="/user/custom-package"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-500"
            >
              <Sparkles size={15} /> Customize Trip
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
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
                  My Travel Dashboard
                </h1>
                <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
                  Discover Umrah & Hajj packages, customize itinerary services, and track your trip requests.
                </p>
              </div>
            </div>

            {/* Right Tools & User Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-xs">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden text-left text-xs sm:block">
                  <div className="font-bold text-slate-900 truncate max-w-[120px]">{userName}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{userId}</div>
                </div>
              </Link>

              <div className="h-6 w-px bg-slate-200" />

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                title="Log Out"
                className="flex items-center justify-center h-9 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold gap-1.5 transition cursor-pointer"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1550px] flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      <LogOutPopModal
        isModalOpen={showLogoutModal}
        setModalOpen={setShowLogoutModal}
      />
    </div>
  );
}
