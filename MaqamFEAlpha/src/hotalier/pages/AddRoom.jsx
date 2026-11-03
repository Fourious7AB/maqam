import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { BedDouble } from "lucide-react";

import RoomForm from "../components/RoomForm";
import { useHotelierData } from "../components/hotelierContext";

/**
 * Add Room — the sidebar stays visible (it's part of the layout). Submitting
 * creates a new room-and-pricing card and drops you on Room Availability where
 * the new card is waiting.
 */
export default function AddRoom() {
  const { addRoom } = useHotelierData();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await addRoom(values);
      toast.success("Room block submitted, waiting for admin approval");
      navigate("/hotelier/rooms");
    } catch (err) {
      toast.error(err?.message || "Couldn't create the room");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/60 px-5 py-4 sm:px-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <BedDouble size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950">Submit a room block</h2>
            <p className="text-xs text-slate-500">
              Set the rate, dates and rooms. The agency admin approves it before it goes on sale.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <RoomForm
            blockMode
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Submit for approval"
          />
        </div>
      </div>
    </div>
  );
}
