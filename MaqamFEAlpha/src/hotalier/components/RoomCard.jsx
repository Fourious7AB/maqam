import { useState } from "react";
import { toast } from "react-toastify";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Minus,
  Plus,
  Users,
  Star,
  UtensilsCrossed,
  Images,
  BedDouble,
} from "lucide-react";

import SmartImage from "./SmartImage";
import StatusBadge from "../../admin/components/common/StatusBadge";
import { deriveRoomStatus } from "../data/hotelierRooms";
import { fmtDate, reviewBadge } from "../services/stockApi";
import { money } from "../../utils/format";

export default function RoomCard({ room, onAdjust, onEdit, onDelete, onView, canIncrease = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const images = room.images || [];
  const status = deriveRoomStatus(room.available, room.total);
  const review = room.reviewStatus ? reviewBadge(room.reviewStatus) : null;
  const stayLabel =
    room.checkIn && room.checkOut
      ? `${fmtDate(room.checkIn)} to ${fmtDate(room.checkOut)}`
      : "";

  const plus = async () => {
    setBusy(true);
    try {
      const changed = await onAdjust(1);
      if (changed) toast.success(`${room.type}: held room released`);
    } finally {
      setBusy(false);
    }
  };

  const minus = async () => {
    if ((room.available || 0) <= 0) {
      toast.info(`${room.type} has no available rooms to hold`);
      return;
    }
    setBusy(true);
    try {
      const changed = await onAdjust(-1);
      if (changed) toast.success(`${room.type}: one room held`);
    } finally {
      setBusy(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);
  const runAction = (fn) => {
    closeMenu();
    fn();
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:shadow-md">
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        <SmartImage
          src={images[0]}
          alt={room.type}
          Icon={BedDouble}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StatusBadge status={status} />
          {review && (
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${review.className}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {review.label}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Images size={11} />
            {images.length} photos
          </span>
        )}

        {/* Three-dot menu */}
        <div className="absolute right-2 top-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Room options"
            aria-haspopup="menu"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white"
          >
            <MoreVertical size={17} />
          </button>

          {menuOpen && (
            <>
              {/* click-catcher to close */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={closeMenu}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAction(onView)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <Eye size={15} className="text-emerald-600" /> View
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAction(onEdit)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={15} className="text-blue-600" /> Edit
                </button>
                {onDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runAction(onDelete)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold text-emerald-950">{room.type}</h3>
            <div className="mt-0.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < (room.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                />
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-bold text-emerald-700">{money(room.price, room.currency)}</div>
            <div className="text-[10px] text-slate-400">per night</div>
          </div>
        </div>

        {stayLabel && (
          <p className="mt-1 text-[11px] font-medium text-slate-500">{stayLabel}</p>
        )}

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            <Users size={12} /> {room.capacity} guests
          </span>
          {room.meal?.provided && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              <UtensilsCrossed size={12} /> {room.meal.plan || "Meal included"}
            </span>
          )}
          {(room.amenities || []).slice(0, 2).map((a) => (
            <span key={a} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              {a}
            </span>
          ))}
        </div>

        {/* Availability control */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50/70 px-3 py-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Availability
            </div>
            <div className="text-sm font-bold text-emerald-950">
              {room.available}
              <span className="font-normal text-slate-400"> / {room.total} rooms</span>
              {(room.blocked || 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {room.blocked} held
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={minus}
              disabled={busy || (room.available || 0) <= 0}
              aria-label="Hold a room"
              title="Hold a room for maintenance"
              className="grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={plus}
              disabled={busy || !canIncrease}
              aria-label="Release a held room"
              title={canIncrease ? "Release a held room" : "No held rooms to release"}
              className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
