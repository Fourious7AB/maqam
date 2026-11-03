import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "../../common/Button";

const ROLES = [
  "flight_departure",
  "flight_return",
  "hotel_checkin",
  "hotel_checkout",
  "transfer",
  "activity",
  "meal",
  "other",
];

export default function ItineraryBuilder({ form, setField }) {
  const [draft, setDraft] = useState({ title: "", description: "" });

  const add = () => {
    if (!draft.title.trim()) return;
    const nextDay = form.itinerary.length + 1;
    setField("itinerary", [...form.itinerary, { day: nextDay, title: draft.title.trim(), description: draft.description.trim(), assignedOffers: [] }]);
    setDraft({ title: "", description: "" });
  };

  const remove = (day) => {
    setField("itinerary", form.itinerary.filter((item) => item.day !== day).map((item, index) => ({ ...item, day: index + 1 })));
  };

  const updateDay = (day, patch) => {
    setField("itinerary", form.itinerary.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  };

  const addAssignment = (item) => {
    const assignedOffers = [...(item.assignedOffers ?? []), { offer: "", role: "activity", notes: "" }];
    updateDay(item.day, { assignedOffers });
  };

  const updateAssignment = (item, index, patch) => {
    const assignedOffers = item.assignedOffers.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    updateDay(item.day, { assignedOffers });
  };

  const removeAssignment = (item, index) => {
    updateDay(item.day, { assignedOffers: item.assignedOffers.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-slate-900">Itinerary Builder</h2><p className="mt-1 text-sm text-slate-500">Build the day-by-day itinerary and assign bundled offers to each day.</p></div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_auto]">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Day title" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Day description" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
        <Button onClick={add}><Plus size={16} />Add Day</Button>
      </div>

      <div className="space-y-3">
        {form.itinerary.map((item) => (
          <div key={`${item.day}-${item.title}`} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">{item.day}</div>
              <div className="min-w-0 flex-1"><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p></div>
              <button onClick={() => remove(item.day)} className="h-9 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Assigned offers</p>
                <button
                  type="button"
                  onClick={() => addAssignment(item)}
                  disabled={!form.offers.length}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-slate-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={12} /> Assign offer
                </button>
              </div>

              {(item.assignedOffers ?? []).length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">
                  {form.offers.length ? "No offers assigned to this day yet." : "Bundle offers first (Offers step) to assign them here."}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {item.assignedOffers.map((entry, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-[1fr_170px_1fr_auto]">
                      <select
                        value={entry.offer ?? ""}
                        onChange={(e) => updateAssignment(item, index, { offer: e.target.value })}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                      >
                        <option value="">Select offer...</option>
                        {form.offers.map((offer) => (
                          <option key={offer.offerId} value={offer.offerId}>{offer.title}</option>
                        ))}
                      </select>
                      <select
                        value={entry.role ?? "activity"}
                        onChange={(e) => updateAssignment(item, index, { role: e.target.value })}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{role.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                      <input
                        value={entry.notes ?? ""}
                        onChange={(e) => updateAssignment(item, index, { notes: e.target.value })}
                        placeholder="Notes (e.g. Depart T3 at 08:30 AM)"
                        className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeAssignment(item, index)}
                        className="h-10 rounded-lg px-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!form.itinerary.length && <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">No itinerary days added yet.</div>}
    </div>
  );
}
