import { Link } from "react-router-dom";
import {
  BedDouble,
  DoorOpen,
  ShieldCheck,
  Layers,
  Plus,
  ArrowRight,
  Building2,
} from "lucide-react";

import StatCard from "../components/StatCard";
import { useHotelierData } from "../components/hotelierContext";
import { money } from "../../utils/format";
import { fmtDate, reviewBadge } from "../services/stockApi";

export default function HotelierDashboard() {
  const { rooms, profile } = useHotelierData();

  const totalRooms = rooms.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const availableRooms = rooms.reduce((s, r) => s + (Number(r.available) || 0), 0);
  const heldRooms = rooms.reduce((s, r) => s + (Number(r.blocked) || 0), 0);
  const bookedRooms = Math.max(0, totalRooms - availableRooms);
  const occupancy = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;

  const hotelName = profile?.hotel?.name || "InterContinental Riyadh";
  const firstName = profile?.user?.firstName || profile?.user?.fullName?.split(" ")[0] || "arav";

  const recentBlocks = rooms.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Occupancy hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-sm sm:p-6"
        style={{ backgroundImage: "linear-gradient(120deg,#065f46 0%,#047857 55%,#059669 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full opacity-30 blur-2xl"
          style={{ background: "radial-gradient(circle,#6ee7b7,transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
              Welcome back, {firstName}
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold tracking-tight">{hotelName}</h2>
            <p className="mt-1 max-w-md text-sm text-emerald-50/90">
              {availableRooms} of {totalRooms} rooms available across {rooms.length} room blocks.
            </p>
          </div>

          <div className="shrink-0">
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center ring-1 ring-inset ring-white/15">
              <div className="text-4xl font-bold leading-none">{occupancy}%</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100/80">
                Allocation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Hotel KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total capacity" value={totalRooms} icon={BedDouble} color="emerald" />
        <StatCard label="Available now" value={availableRooms} icon={DoorOpen} color="green" />
        <StatCard label="Held units" value={heldRooms} icon={ShieldCheck} color="amber" />
        <StatCard label="Active blocks" value={rooms.length} icon={Layers} color="violet" />
      </div>

      {/* Quick actions + active room blocks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Quick actions */}
        <div className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-950">Quick actions</h3>
            <div className="mt-4 space-y-2.5">
              <QuickAction
                to="/hotelier/rooms/add"
                icon={Plus}
                title="Add a room block"
                subtitle="Create a new batch and submit for review"
              />
              <QuickAction
                to="/hotelier/rooms"
                icon={BedDouble}
                title="Manage room inventory"
                subtitle="Adjust live availability with unit steppers"
              />
              <QuickAction
                to="/hotelier/profile"
                icon={Building2}
                title="My hotel profile"
                subtitle="Property details and manager credentials"
              />
            </div>
          </div>
        </div>

        {/* Active room blocks */}
        <div className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Active room blocks</h3>
                <p className="text-xs text-slate-500">Live batches submitted for booking</p>
              </div>
              <Link
                to="/hotelier/rooms"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentBlocks.length === 0 ? (
              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">No room blocks created yet.</p>
                <Link
                  to="/hotelier/rooms/add"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Plus size={14} /> Add your first block
                </Link>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {recentBlocks.map((r) => {
                  const badge = reviewBadge(r.reviewStatus);
                  return (
                    <div key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{r.type}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {r.checkIn && r.checkOut ? `${fmtDate(r.checkIn)} to ${fmtDate(r.checkOut)}` : "Open dates"}
                          {r.meals && r.meals.length > 0 ? ` · ${r.meals.join(", ")}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-700">
                            {money(r.price, r.currency || "SAR")}
                            <span className="text-xs font-normal text-slate-400"> / night</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <span className="font-semibold text-emerald-600">{r.available}</span> of {r.total} available
                          </div>
                        </div>
                        <Link
                          to="/hotelier/rooms"
                          className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/60"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction(props) {
  const { to, icon: Icon, title, subtitle } = props;
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 transition hover:border-emerald-300 hover:bg-emerald-50"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white transition group-hover:bg-emerald-500">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-emerald-950">{title}</div>
        <div className="truncate text-[11px] text-slate-500">{subtitle}</div>
      </div>
      <ArrowRight size={16} className="text-emerald-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </Link>
  );
}
