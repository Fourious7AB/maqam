import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useAuth } from "../../store/authContext";

export default function Header({ onMenu, title = "Dashboard Overview", subtitle = "Manage Makkah & Madinah travel inventory, pricing and bookings in one place.", icon: Icon }) {
  const { user } = useAuth();
  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";
  const displayRole = user?.role || "customer";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Open sidebar"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu size={21} />
        </button>

        <button className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:block">
          <Menu size={21} />
        </button>

        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-slate-900 sm:text-[22px]">
            {Icon ? <Icon size={21} className="text-blue-600" /> : null}
            {title}
          </h1>
          <p className="hidden text-[11px] text-slate-500 sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">
          <Search size={19} />
        </button>

        <button className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100">
          <Bell size={19} />
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            5
          </span>
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
            AU
          </div>

          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-semibold text-slate-800">{displayName}</div>
            <div className="mt-1 text-[10px] capitalize text-slate-500">{displayRole}</div>
          </div>

          <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
        </div>
      </div>
    </header>
  );
}
