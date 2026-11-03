import { useState } from "react";

import ImageUploader from "./ImageUploader";
import { CAR_TYPES } from "../data/hotelierCars";

const PRESET_TYPES = CAR_TYPES.filter((t) => t !== "Others");

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const labelClass = "mb-1 block text-sm font-semibold text-emerald-950";

/** Car form shared by "Add car details" and the "Edit" modal. */
export default function CarForm({ initial = {}, onSubmit, submitting, submitLabel = "Add car" }) {
  const startType = initial.type || "";
  const isPreset = PRESET_TYPES.includes(startType);

  const [typeChoice, setTypeChoice] = useState(startType ? (isPreset ? startType : "Others") : "");
  const [customType, setCustomType] = useState(isPreset ? "" : startType);
  const [images, setImages] = useState(
    (initial.image ? [initial.image] : []).map((url) => ({ url, name: "", uploaded: true }))
  );
  const [model, setModel] = useState(initial.model || "");
  const [seating, setSeating] = useState(initial.seating ?? "");
  const [price, setPrice] = useState(initial.price ?? "");
  const [currency, setCurrency] = useState(initial.currency || "SAR");
  const [total, setTotal] = useState(initial.total ?? "");
  const [available, setAvailable] = useState(initial.available ?? "");
  const [errors, setErrors] = useState({});

  const isOthers = typeChoice === "Others";

  const validate = () => {
    const next = {};
    const finalType = isOthers ? customType.trim() : typeChoice;
    if (!finalType) next.type = "Choose a car type";
    if (!(Number(price) > 0)) next.price = "Enter a price";
    if (!(Number(seating) > 0)) next.seating = "Enter seating capacity";
    if (!(Number(total) > 0)) next.total = "Enter fleet size";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalType = isOthers ? customType.trim() : typeChoice;
    const totalNum = Number(total);
    const availNum = available === "" ? totalNum : Math.min(Number(available), totalNum);

    onSubmit({
      type: finalType,
      model: model.trim(),
      image: images[0]?.url || "",
      images: images.map((img) => img.url).filter(Boolean),
      seating: Number(seating),
      price: Number(price),
      currency,
      total: totalNum,
      available: availNum,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ImageUploader value={images} onChange={setImages} max={4} label="Car photos" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Car type</label>
          <select value={typeChoice} onChange={(e) => setTypeChoice(e.target.value)} className={inputClass}>
            <option value="" disabled>
              Select a car type
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
            <label className={labelClass}>Custom car type</label>
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="e.g. Minibus"
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              Model <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. GMC Yukon"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {isOthers && (
        <div>
          <label className={labelClass}>
            Model <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Mercedes Sprinter"
            className={inputClass}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Seating capacity</label>
          <input
            type="number"
            min="1"
            value={seating}
            onChange={(e) => setSeating(e.target.value)}
            placeholder="e.g. 6"
            className={inputClass}
          />
          {errors.seating && <p className="mt-1 text-xs text-red-500">{errors.seating}</p>}
        </div>
        <div>
          <label className={labelClass}>Price / trip</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 240"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Fleet size (total cars)</label>
          <input
            type="number"
            min="1"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="e.g. 6"
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
            placeholder="defaults to fleet size"
            className={inputClass}
          />
        </div>
      </div>

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
