import { useState } from "react";
import { Plus } from "lucide-react";
import Input from "../../common/Input";
import PackageImages from "./PackageImages";

export default function BasicDetails({ form, setField }) {
  const [inclusionDraft, setInclusionDraft] = useState("");

  const addInclusion = () => {
    const value = inclusionDraft.trim();
    if (!value || form.inclusions?.includes(value)) return;
    setField("inclusions", [...(form.inclusions ?? []), value]);
    setInclusionDraft("");
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Basic Details" subtitle="Define the package identity, validity and visibility." />
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Package Title" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Premium Umrah" required />
        <Input label="Destination" value={form.destination} onChange={(e) => setField("destination", e.target.value)} placeholder="Makkah & Madinah" required />
        <Input label="Duration (days)" type="number" min="1" value={form.durationDays} onChange={(e) => setField("durationDays", Number(e.target.value))} />
        <Input label="Nights" type="number" min="0" value={form.nights} onChange={(e) => setField("nights", Number(e.target.value))} />
        <Input label="Validity From" type="date" value={form.validityFrom} onChange={(e) => setField("validityFrom", e.target.value)} />
        <Input label="Validity To" type="date" value={form.validityTo} onChange={(e) => setField("validityTo", e.target.value)} />
        <Input label="Available Slots" type="number" min="0" value={form.availableSlots} onChange={(e) => setField("availableSlots", Number(e.target.value))} />
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Visibility</span><select value={form.visibility} onChange={(e) => setField("visibility", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="public">Public</option><option value="private">Private</option></select></label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Status</span><select value={form.status} onChange={(e) => setField("status", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Description</span><textarea rows={5} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe what is included in the package..." className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" /></label>

      <div className="border-t border-slate-100 pt-5">
        <PackageImages images={form.images ?? []} onChange={(images) => setField("images", images)} />
      </div>

      <div className="border-t border-slate-100 pt-5">
        <p className="text-sm font-semibold text-slate-700">Inclusions</p>
        <p className="text-xs text-slate-400">What the package covers, e.g. Flights, Hotel, Airport Transfers.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={inclusionDraft}
            onChange={(e) => setInclusionDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInclusion(); } }}
            placeholder="Add an inclusion and press Enter"
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
          <button
            type="button"
            onClick={addInclusion}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            <Plus size={15} /> Add
          </button>
        </div>
        {(form.inclusions ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.inclusions.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1.5 pl-3 pr-1.5 text-xs font-semibold text-emerald-800">
                {item}
                <button
                  type="button"
                  onClick={() => setField("inclusions", form.inclusions.filter((entry) => entry !== item))}
                  className="rounded-full p-0.5 transition hover:bg-emerald-200"
                  aria-label={`Remove ${item}`}
                >
                  <Plus size={12} className="rotate-45" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function SectionTitle({ title, subtitle }) {
  return <div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>;
}
