import {
  ChevronRight,
  MapPinned,
  Building2,
  Star,
  Calendar,
  Users,
  Package,
  Sparkles,
   MapPin
} from "lucide-react";
import { GlassInput } from "../CustomPackageBuilder";
const HotelPreferences = ({ form, update }) => {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div
          className="
            inline-flex
            items-center
            gap-1.5
            px-3
            py-1.5
            rounded-full
            text-xs
            font-bold
            text-emerald-700
            bg-emerald-50
            border
            border-emerald-100
            mb-3
          "
        >
          <Building2 size={13} />
          Hotel Preferences
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Choose Your Hotel
        </h2>

        <p className="text-sm text-zinc-500 mt-2 max-w-xl">
          Tell us what kind of accommodation you prefer. You can skip this step
          if you want our team to recommend the best options.
        </p>
      </div>

      {/* Hotel Location */}
      <div>
        <p
          className="
            text-[11px]
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            mb-3
            flex
            items-center
            gap-1.5
          "
        >
          <MapPinned size={13} className="text-emerald-600" />
          Hotel Location
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassInput
            label="City / Area"
            placeholder="e.g. Makkah, Madinah"
            icon={MapPin}
            value={form.hotelDestination}
            onChange={(v) => update("hotelDestination", v)}
          />

          <GlassInput
            label="Preferred Hotel"
            placeholder="e.g. Hilton, Fairmont"
            icon={Building2}
            value={form.hotel}
            onChange={(v) => update("hotel", v)}
          />
        </div>
      </div>

      {/* Hotel Category */}
      <div>
        <p
          className="
            text-[11px]
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            mb-3
            flex
            items-center
            gap-1.5
          "
        >
          <Star size={13} className="text-emerald-600" />
          Hotel Category
        </p>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              value: "3 Star",
              label: "3 Star",
              description: "Comfort",
            },
            {
              value: "4 Star",
              label: "4 Star",
              description: "Premium",
            },
            {
              value: "5 Star",
              label: "5 Star",
              description: "Luxury",
            },
          ].map((hotel) => {
            const active = form.hotelCategory === hotel.value;

            return (
              <button
                key={hotel.value}
                type="button"
                onClick={() => update("hotelCategory", hotel.value)}
                className={`
                  rounded-xl
                  border
                  px-3
                  py-3
                  text-left
                  transition-all
                  duration-200
                  cursor-pointer
                  ${
                    active
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                  }
                `}
              >
                <div
                  className={`text-sm font-bold ${
                    active ? "text-emerald-700" : "text-zinc-800"
                  }`}
                >
                  {hotel.label}
                </div>

                <div className="text-[11px] text-zinc-400 mt-1">
                  {hotel.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Distance */}
    

      {/* Room Details */}
      <div>
        <p
          className="
            text-[11px]
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            mb-3
            flex
            items-center
            gap-1.5
          "
        >
          <Users size={13} className="text-emerald-600" />
          Room Details
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-[0.12em]">
              Room Type
            </label>

            <select
              value={form.roomType}
              onChange={(e) => update("roomType", e.target.value)}
              className="
                w-full
                h-12
                px-4
                rounded-xl
                bg-white
                border
                border-zinc-200
                text-sm
                font-medium
                text-zinc-700
                outline-none
                cursor-pointer
                focus:border-zinc-400
                focus:ring-4
                focus:ring-zinc-900/5
              "
            >
              <option value="">Select room type</option>
              <option value="Single">Single Room</option>
              <option value="Double">Double Room</option>
              <option value="Triple">Triple Room</option>
              <option value="Quad">Quad Room</option>
              <option value="Family">Family Room</option>
            </select>
          </div>

          <GlassInput
            label="Number of Rooms"
            placeholder="e.g. 1"
            icon={Building2}
            type="number"
            value={form.rooms}
            onChange={(v) => update("rooms", v)}
          />
        </div>
      </div>

      {/* Meal Plan */}
      <div>
        <p
          className="
            text-[11px]
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            mb-3
            flex
            items-center
            gap-1.5
          "
        >
          <Package size={13} className="text-emerald-600" />
          Meal Plan
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Room Only", "Breakfast", "Half Board", "Full Board"].map(
            (meal) => {
              const active = form.mealPlan === meal;

              return (
                <button
                  key={meal}
                  type="button"
                  onClick={() => update("mealPlan", meal)}
                  className={`
                  rounded-xl
                  border
                  px-3
                  py-3
                  text-xs
                  font-semibold
                  transition-all
                  cursor-pointer
                  ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }
                `}
                >
                  {meal}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Hotel Dates */}
      <div>
        <p
          className="
            text-[11px]
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            mb-3
            flex
            items-center
            gap-1.5
          "
        >
          <Calendar size={13} className="text-emerald-600" />
          Hotel Stay
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassInput
            label="Check-in"
            placeholder="Select date"
            icon={Calendar}
            type="date"
            value={form.checkIn}
            onChange={(v) => update("checkIn", v)}
          />

          <GlassInput
            label="Check-out"
            placeholder="Select date"
            icon={Calendar}
            type="date"
            value={form.checkOut}
            onChange={(v) => update("checkOut", v)}
          />
        </div>
      </div>

      {/* Special Hotel Requests */}
      <div className="flex flex-col gap-2">
        <label
          className="
            text-[11px]
            sm:text-xs
            font-bold
            text-zinc-500
            uppercase
            tracking-[0.12em]
            flex
            items-center
            gap-1.5
          "
        >
          <Sparkles size={13} className="text-emerald-600" />
          Hotel Requirements
          <span className="normal-case tracking-normal font-medium text-zinc-400">
            Optional
          </span>
        </label>

        <textarea
          rows={3}
          placeholder="e.g. Haram view, family room, wheelchair accessible room..."
          value={form.hotelRequests}
          onChange={(e) => update("hotelRequests", e.target.value)}
          className="
            w-full
            px-4
            py-3
            text-sm
            text-zinc-900
            placeholder:text-zinc-400
            rounded-xl
            outline-none
            resize-none
            bg-white
            border
            border-zinc-200
            transition-all
            duration-200
            focus:border-zinc-400
            focus:ring-4
            focus:ring-zinc-900/5
          "
        />
      </div>
    </div>
  );
};

export default HotelPreferences;
