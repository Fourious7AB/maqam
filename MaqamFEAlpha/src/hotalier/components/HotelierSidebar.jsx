import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  BedDouble,
  Hotel,
  LogOut,
  X,
  Building2,
} from "lucide-react";

import { useAuthStore } from "../../admin/store/authStore";
import { useHotelierData } from "./hotelierContext";

// Sidebar navigation sections.
const NAV_SECTIONS = [
  {
    label: "Manage",
    items: [
      ["Overview", LayoutDashboard, "/hotelier"],
      ["My Hotel", Building2, "/hotelier/profile"],
      ["Room Inventory", BedDouble, "/hotelier/rooms"],
      ["Add Room Block", PlusCircle, "/hotelier/rooms/add"],
    ],
  },
];

export default function HotelierSidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { rooms, profile } = useHotelierData();

  const hotelName = profile?.hotel?.name || "InterContinental Riyadh";
  const userName = profile?.user?.fullName || profile?.user?.firstName || "arav Doe";
  const userRole = profile?.user?.role || "hotelier";

  // Capacity allocation across every room stock batch
  const totalRooms = rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const availableRooms = rooms.reduce((sum, r) => sum + (Number(r.available) || 0), 0);
  const heldRooms = Math.max(0, totalRooms - availableRooms);
  const occupancy = totalRooms > 0 ? Math.round((heldRooms / totalRooms) * 100) : 0;

  const isActive = (path) => pathname === path;
  const closeOnMobile = () => onClose && onClose();

  const handleLogout = async () => {
    // Revokes the backend refresh token, clears secure session cookies,
    // purges localStorage, and returns to the administrators login screen.
    await logout();
    navigate("/admin/administrators/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-emerald-950/50 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[266px] flex-col text-emerald-50 shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundImage:
            "linear-gradient(180deg,#064e3b 0%,#065f46 46%,#04372a 100%)",
        }}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link to="/hotelier" onClick={closeOnMobile} className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-emerald-500 text-emerald-950 shadow-inner">
              <Hotel size={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold leading-tight tracking-tight text-white" title={hotelName}>
                {hotelName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/80">
                Hotel Dashboard
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1 text-emerald-100 transition hover:bg-white/10 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
                {section.label}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const [label, Icon, path] = item;
                  const active = isActive(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={closeOnMobile}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                        active
                          ? "bg-white/15 text-white ring-1 ring-inset ring-white/15"
                          : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {/* Active accent bar */}
                      <span
                        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-300 transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <Icon
                        size={18}
                        className={active ? "text-emerald-200" : "text-emerald-300/80 group-hover:text-emerald-200"}
                      />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Signature: occupancy meter + logout at the bottom */}
        <div className="shrink-0 space-y-3 px-3 pb-4">
          <div className="relative overflow-hidden rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/10">
            {/* soft glow */}
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl"
              style={{ background: "radial-gradient(circle,#6ee7b7,transparent 70%)" }}
            />
            <div className="relative">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/80">
                  Occupancy
                </span>
                <span className="text-lg font-bold text-white">{occupancy}%</span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-950/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-all duration-500"
                  style={{ width: `${occupancy}%` }}
                />
              </div>

              <p className="mt-2 text-[11px] text-emerald-100/80">
                {heldRooms} of {totalRooms} rooms allocated · {availableRooms} free
              </p>
            </div>
          </div>

          {/* User profile card */}
          <Link
            to="/hotelier/profile"
            onClick={closeOnMobile}
            className="group flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 ring-1 ring-inset ring-white/15 transition hover:bg-white/20"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-300 text-xs font-bold text-emerald-950">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white group-hover:text-emerald-200">
                {userName}
              </div>
              <div className="truncate text-[10px] capitalize text-emerald-200/80">
                {userRole}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/20"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
