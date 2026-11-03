import { useState } from "react";
import { CalendarDays, UtensilsCrossed } from "lucide-react";

import ImageUploader from "./ImageUploader";
import { ROOM_TYPES } from "../data/hotelierRooms";

const PRESET_TYPES = ROOM_TYPES.filter((t) => t !== "Others");
const MEAL_OPTIONS = ["breakfast", "lunch", "dinner"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const labelClass = "mb-1 block text-sm font-semibold text-emerald-950";

/**
 * Room form shared by the "Add Room" screen and the "Edit" modal.
 * Emits a clean room object via onSubmit; the parent decides create vs update.
 *
 * blockMode  -> renders the wholesale block fields the hotelier API expects
 *               (check-in/out, reservation ref, name-addition deadline, unit
 *               count, meal plan as breakfast/lunch/dinner checkboxes) and
 *               hides storefront-only fields (photos, capacity, amenities).
 * lockDates  -> Guard 1: disables check-in/out once any unit in the batch is
 *               booked by a customer (contact agency admin to change dates).
 */
export default function RoomForm({
  initial = {},
  onSubmit,
  submitting,
  submitLabel = "Create room",
  blockMode = false,
  lockDates = false,
}) {
  const startType = initial.type || "";
  const isPreset = PRESET_TYPES.includes(startType);

  const [typeChoice, setTypeChoice] = useState(startType ? (isPreset ? startType : "Others") : "");
  const [customType, setCustomType] = useState(isPreset ? "" : startType);
  const [images, setImages] = useState(
    (initial.images || []).map((url) => ({ url, name: "", uploaded: true }))
  );
  const [capacity, setCapacity] = useState(initial.capacity ?? "");
  const [price, setPrice] = useState(initial.price ?? "");
  const [currency, setCurrency] = useState(initial.currency || "SAR");
  const [total, setTotal] = useState(initial.total ?? "");
  const [available, setAvailable] = useState(initial.available ?? "");
  const [rating, setRating] = useState(initial.rating || 4);
  const [amenities, setAmenities] = useState((initial.amenities || []).join(", "));

  // Wholesale block fields (blockMode only)
  const [checkIn, setCheckIn] = useState(String(initial.checkIn || "").slice(0, 10));
  const [checkOut, setCheckOut] = useState(String(initial.checkOut || "").slice(0, 10));
  const [reservationRef, setReservationRef] = useState(initial.reservationRef || "");
  const [deadline, setDeadline] = useState(
    String(initial.nameAdditionDeadline || "").slice(0, 10)
  );
  const [unitCount, setUnitCount] = useState(initial.unitCount ?? initial.total ?? "");
  const [meals, setMeals] = useState(
    Array.isArray(initial.meals) ? initial.meals : []
  );

  const [mealProvided, setMealProvided] = useState(Boolean(initial.meal?.provided));
  const [mealPlan, setMealPlan] = useState(initial.meal?.plan || "");
  const [mealPrice, setMealPrice] = useState(initial.meal?.price ?? "");

  const [errors, setErrors] = useState({});
  const isOthers = typeChoice === "Others";

  const toggleMeal = (option) => {
    setMeals((prev) =>
      prev.includes(option) ? prev.filter((m) => m !== option) : [...prev, option]
    );
  };

  const validate = () => {
    const next = {};
    const finalType = isOthers ? customType.trim() : typeChoice;
    if (!finalType) next.type = "Choose a room type";
    if (!(Number(price) > 0)) next.price = "Enter a nightly price";

    if (blockMode) {
      if (!checkIn) next.checkIn = "Pick the block start date";
      if (!checkOut) next.checkOut = "Pick the block end date";
      if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
        next.checkOut = "Check-out must be after check-in";
      }
      if (!reservationRef.trim()) next.reservationRef = "Enter the contract reference";
      if (!deadline) next.deadline = "Pick the name-addition deadline";
      if (!(Number(unitCount) >= 1)) next.unitCount = "Enter how many rooms in this block";
    } else {
      if (!(Number(capacity) > 0)) next.capacity = "Enter guest capacity";
      if (!(Number(total) > 0)) next.total = "Enter how many rooms";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalType = isOthers ? customType.trim() : typeChoice;
    const totalNum = Number(unitCount || total);
    const availNum =
      available === "" || blockMode ? totalNum : Math.min(Number(available), totalNum);

    const payload = {
      type: finalType,
      price: Number(price),
      currency,
      total: totalNum,
      available: availNum,
    };

    if (blockMode) {
      payload.meals = meals;
      payload.meal = {
        provided: meals.length > 0,
        plan: meals.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" + "),
        price: 0,
      };
      payload.checkIn = checkIn;
      payload.checkOut = checkOut;
      payload.reservationRef = reservationRef.trim();
      payload.nameAdditionDeadline = deadline;
      payload.unitCount = Number(unitCount);
    } else {
      payload.images = images.map((img) => img.url).filter(Boolean);
      payload.capacity = Number(capacity);
      payload.rating = Number(rating);
      payload.meal = mealProvided
        ? { provided: true, plan: mealPlan.trim(), price: Number(mealPrice) || 0 }
        : { provided: false, plan: "", price: 0 };
      payload.amenities = amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Images at the very top, per the brief (storefront mode only) */}
      {!blockMode && <ImageUploader value={images} onChange={setImages} max={8} />}

      {/* Room type */}
      <div className={`grid grid-cols-1 gap-4 ${blockMode ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
        <div>
          <label className={labelClass}>Room type</label>
          <select
            value={typeChoice}
            onChange={(e) => setTypeChoice(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select a room type
            </option>
            {PRESET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Others">Others (type your own)</option>
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
        </div>

        {isOthers ? (
          <div>
            <label className={labelClass}>Custom room type</label>
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="e.g. Family Suite"
              className={inputClass}
            />
          </div>
        ) : (
          !blockMode && (
            <div>
              <label className={labelClass}>Star rating</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)} className={inputClass}>
                {[3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} star
                  </option>
                ))}
              </select>
            </div>
          )
        )}

        <div>
          <label className={labelClass}>Price / night</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 340"
            className={inputClass}
          />
          {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
        </div>

        <div>
          <label className={labelClass}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>

      {/* Block details — matches POST /api/v1/hotelier/stock */}
      {blockMode && (
        <>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
              <CalendarDays size={15} className="text-emerald-600" />
              Block details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  disabled={lockDates}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                />
                {errors.checkIn && <p className="mt-1 text-xs text-red-500">{errors.checkIn}</p>}
              </div>
              <div>
                <label className={labelClass}>Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  disabled={lockDates}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                />
                {errors.checkOut && <p className="mt-1 text-xs text-red-500">{errors.checkOut}</p>}
              </div>
              <div>
                <label className={labelClass}>Rooms in this block</label>
                <input
                  type="number"
                  min="1"
                  value={unitCount}
                  disabled={lockDates}
                  onChange={(e) => setUnitCount(e.target.value)}
                  placeholder="e.g. 6"
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                />
                {errors.unitCount && <p className="mt-1 text-xs text-red-500">{errors.unitCount}</p>}
              </div>
              <div>
                <label className={labelClass}>Name-addition deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
                {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Reservation reference</label>
                <input
                  type="text"
                  value={reservationRef}
                  onChange={(e) => setReservationRef(e.target.value)}
                  placeholder="e.g. HOTELIER-DEC-PALM"
                  className={inputClass}
                />
                {errors.reservationRef && (
                  <p className="mt-1 text-xs text-red-500">{errors.reservationRef}</p>
                )}
              </div>
            </div>
            {lockDates && (
              <p className="mt-3 text-xs font-medium text-amber-600">
                Dates and room count are locked because some rooms in this batch are already
                booked. Contact the agency admin to change them.
              </p>
            )}
          </div>

          {/* Meals as plan checkboxes */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
              <UtensilsCrossed size={15} className="text-emerald-600" />
              Meals included in the rate
            </label>
            <div className="mt-2.5 flex flex-wrap gap-4">
              {MEAL_OPTIONS.map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 text-sm capitalize text-slate-700">
                  <input
                    type="checkbox"
                    checked={meals.includes(option)}
                    onChange={() => toggleMeal(option)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Storefront-only fields (mock mode keeps the original layout) */}
      {!blockMode && (
        <>
          {/* Capacity + price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Guest capacity</label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 2"
                className={inputClass}
              />
              {errors.capacity && <p className="mt-1 text-xs text-red-500">{errors.capacity}</p>}
            </div>

            <div>
              <label className={labelClass}>Price / night</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 340"
                className={inputClass}
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
            </div>

            <div>
              <label className={labelClass}>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Total rooms</label>
              <input
                type="number"
                min="1"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="e.g. 20"
                className={inputClass}
              />
              {errors.total && <p className="mt-1 text-xs text-red-500">{errors.total}</p>}
            </div>
            <div>
              <label className={labelClass}>
                Available now <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                placeholder="defaults to total"
                className={inputClass}
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className={labelClass}>
              Amenities <span className="font-normal text-slate-400">(comma separated)</span>
            </label>
            <input
              type="text"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="Wi-Fi, AC, Kaaba View"
              className={inputClass}
            />
          </div>

          {/* Meal */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={mealProvided}
                onChange={(e) => setMealProvided(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
                <UtensilsCrossed size={15} className="text-emerald-600" />
                This room includes a meal
              </span>
            </label>

            {mealProvided && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Meal details</label>
                  <input
                    type="text"
                    value={mealPlan}
                    onChange={(e) => setMealPlan(e.target.value)}
                    placeholder="e.g. Breakfast + Dinner"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Meal price</label>
                  <input
                    type="number"
                    min="0"
                    value={mealPrice}
                    onChange={(e) => setMealPrice(e.target.value)}
                    placeholder="0 = included"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
