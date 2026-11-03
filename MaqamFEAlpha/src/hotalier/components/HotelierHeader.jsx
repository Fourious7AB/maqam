import { Link, useLocation } from "react-router-dom";
import { Menu, Hotel, UserCheck } from "lucide-react";

import DataStatusBadge from "./DataStatusBadge";
import { useHotelierData } from "./hotelierContext";

// Per-route subtitle under the constant "Hotel Dashboard" title.
const SUBTITLES = {
  "/hotelier": "Overview of room inventory and stock batches",
  "/hotelier/profile": "Property dossier and manager credentials",
  "/hotelier/rooms/add": "Create a new room batch and pricing block",
  "/hotelier/rooms": "All room batches and live availability",
};

export default function HotelierHeader({ onMenu }) {
  const { pathname } = useLocation();
  const { apiMode, profile } = useHotelierData();
  const subtitle = SUBTITLES[pathname] || "Manage your hotel inventory";
  const hotelName = profile?.hotel?.name || "InterContinental Riyadh";
  const userName = profile?.user?.fullName || profile?.user?.firstName || "arav Doe";

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-emerald-100 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 md:hidden"
        >
          <Menu size={21} />
        </button>

        <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 sm:grid">
          <Hotel size={20} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold tracking-tight text-emerald-950 sm:text-[22px]">
            Hotel Dashboard
          </h1>
          <p className="hidden truncate text-[11px] text-slate-500 sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Live vs sample-data breakdown */}
        <DataStatusBadge apiMode={apiMode} />

        <div className="h-8 w-px bg-emerald-100" />

        <Link
          to="/hotelier/profile"
          className="group flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-emerald-50/70"
          title="View profile and property dossier"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shadow-sm transition group-hover:from-emerald-600 group-hover:to-emerald-800">
            {userName.charAt(0).toUpperCase() || <UserCheck size={18} />}
          </div>
          <div className="hidden leading-tight text-left sm:block">
            <div className="max-w-[160px] truncate text-xs font-semibold text-emerald-950 group-hover:text-emerald-700">
              {userName}
            </div>
            <div className="max-w-[160px] truncate text-[10px] text-slate-500">
              {hotelName}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
