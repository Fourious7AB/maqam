import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, BedDouble, Users, UtensilsCrossed, Star } from "lucide-react";

import RoomCard from "../components/RoomCard";
import RoomForm from "../components/RoomForm";
import SmartImage from "../components/SmartImage";
import Modal from "../../admin/components/common/Modal";
import StatusBadge from "../../admin/components/common/StatusBadge";
import { useHotelierData } from "../components/hotelierContext";
import { deriveRoomStatus } from "../data/hotelierRooms";
import { fmtDate, reviewBadge } from "../services/stockApi";
import { money } from "../../utils/format";

export default function RoomAvailability() {
  const {
    rooms,
    loading,
    apiMode,
    adjustRoomAvailability,
    updateRoom,
    removeRoom,
    addBatchUnits,
  } = useHotelierData();

  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extraUnits, setExtraUnits] = useState("");
  const [addingUnits, setAddingUnits] = useState(false);

  const handleDelete = async (room) => {
    if (!window.confirm(`Delete "${room.type}" (${room.id})? This can't be undone.`)) return;
    try {
      await removeRoom(room.id);
      toast.success("Room deleted");
    } catch (err) {
      toast.error(err?.message || "Couldn't delete the room");
    }
  };

  const handleUpdate = async (values) => {
    setSubmitting(true);
    try {
      if (apiMode) {
        // PATCH only the fields the hotelier actually changed. Unchanged
        // critical fields are never sent, so locked dates can't trip Guard 1.
        const changed = {};
        const day = (v) => String(v || "").slice(0, 10);
        if (values.type !== editing.type) changed.type = values.type;
        if (Number(values.price) !== Number(editing.price)) changed.price = values.price;
        if (day(values.checkIn) !== day(editing.checkIn)) changed.checkIn = values.checkIn;
        if (day(values.checkOut) !== day(editing.checkOut)) changed.checkOut = values.checkOut;
        if (values.reservationRef !== editing.reservationRef)
          changed.reservationRef = values.reservationRef;
        if (day(values.nameAdditionDeadline) !== day(editing.nameAdditionDeadline))
          changed.nameAdditionDeadline = values.nameAdditionDeadline;
        if (JSON.stringify(values.meals || []) !== JSON.stringify(editing.meals || []))
          changed.meals = values.meals;
        await updateRoom(editing.id, changed);
        toast.success("Changes saved, batch sent for approval");
      } else {
        await updateRoom(editing.id, values);
        toast.success("Room updated");
      }
      setEditing(null);
      setExtraUnits("");
    } catch (err) {
      toast.error(err?.message || "Couldn't update the room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUnits = async () => {
    if (!(Number(extraUnits) >= 1)) {
      toast.info("Enter how many rooms to add");
      return;
    }
    setAddingUnits(true);
    try {
      await addBatchUnits(editing.id, Number(extraUnits));
      toast.success(`${extraUnits} rooms added, batch sent for approval`);
      setExtraUnits("");
      setEditing(null);
    } catch (err) {
      toast.error(err?.message || "Couldn't add rooms to the batch");
    } finally {
      setAddingUnits(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-emerald-950">Room availability</h2>
          <p className="text-sm text-slate-500">
            {rooms.length} room {rooms.length === 1 ? "type" : "types"} · use + / − to adjust live
            availability
          </p>
        </div>
        <Link
          to="/hotelier/rooms/add"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          <Plus size={16} /> Add room
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl border border-emerald-100 bg-white" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-emerald-200 bg-white py-16 text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-500">
            <BedDouble size={26} />
          </div>
          <h3 className="font-semibold text-emerald-950">No rooms yet</h3>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Add your first room to start receiving bookings.
          </p>
          <Link
            to="/hotelier/rooms/add"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Plus size={16} /> Add room
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              canIncrease={apiMode ? (room.blocked || 0) > 0 : true}
              onAdjust={(delta) => adjustRoomAvailability(room.id, delta)}
              onEdit={() => setEditing(room)}
              onDelete={apiMode ? undefined : () => handleDelete(room)}
              onView={() => setViewing(room)}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal
          open
          title={`Edit ${editing.type}`}
          onClose={() => {
            setEditing(null);
            setExtraUnits("");
          }}
        >
          <RoomForm
            initial={editing}
            blockMode={apiMode}
            // Guard 1: dates/room type are locked once any unit is sold.
            lockDates={editing.hasBookings}
            onSubmit={handleUpdate}
            submitting={submitting}
            submitLabel="Save changes"
          />

          {/* Add more rooms to this batch (API mode only) */}
          {apiMode && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-sm font-semibold text-emerald-950">
                Need more rooms in this block?
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  min="1"
                  value={extraUnits}
                  onChange={(e) => setExtraUnits(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-32"
                />
                <button
                  type="button"
                  onClick={handleAddUnits}
                  disabled={addingUnits}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Plus size={15} /> Add rooms
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Adding rooms sends the batch back to the admin queue for approval.
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* View modal */}
      {viewing && (
        <Modal
          open
          title={viewing.type}
          onClose={() => setViewing(null)}
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl">
              <SmartImage
                src={(viewing.images || [])[0]}
                alt={viewing.type}
                Icon={BedDouble}
                className="h-52 w-full object-cover"
              />
            </div>

            {(viewing.images || []).length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {viewing.images.slice(1, 5).map((src, i) => (
                  <SmartImage
                    key={i}
                    src={src}
                    alt={`${viewing.type} ${i + 2}`}
                    Icon={BedDouble}
                    className="h-16 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={deriveRoomStatus(viewing.available, viewing.total)} />
              {apiMode && viewing.reviewStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${reviewBadge(viewing.reviewStatus).className}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {reviewBadge(viewing.reviewStatus).label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={i < (viewing.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                  />
                ))}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Price / night" value={money(viewing.price, viewing.currency)} />
              {viewing.capacity ? (
                <Detail label="Guest capacity" value={`${viewing.capacity} guests`} icon={Users} />
              ) : null}
              <Detail label="Available" value={`${viewing.available} of ${viewing.total}`} />
              <Detail
                label="Meal"
                value={viewing.meal?.provided ? viewing.meal.plan || "Included" : "Not included"}
                icon={UtensilsCrossed}
              />
              {apiMode && (
                <>
                  <Detail
                    label="Stay period"
                    value={
                      viewing.checkIn
                        ? `${fmtDate(viewing.checkIn)} to ${fmtDate(viewing.checkOut)}`
                        : "Not set"
                    }
                  />
                  <Detail label="Reservation ref" value={viewing.reservationRef || "Not set"} />
                  <Detail
                    label="Name deadline"
                    value={viewing.nameAdditionDeadline ? fmtDate(viewing.nameAdditionDeadline) : "Not set"}
                  />
                  <Detail label="Held rooms" value={String(viewing.blocked || 0)} />
                </>
              )}
            </dl>

            {(viewing.amenities || []).length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Amenities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {viewing.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800">
        {Icon && <Icon size={14} className="text-emerald-600" />}
        {value}
      </dd>
    </div>
  );
}
