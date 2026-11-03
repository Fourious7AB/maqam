import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import TravelerCount from "../../../components/packages/TravelerCount";

export default function CustomPackage() {
  const navigate = useNavigate();
  const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 });
  const total = travelers.adults + travelers.children + travelers.infants;

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader title="Custom Package" subtitle="Build a custom package for a customer." actions={<Button variant="secondary" onClick={() => navigate("/admin/packages")} >Back to packages</Button>} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Customer"><input placeholder="Search customer..." className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></Field>
          <Field label="Destination"><input placeholder="Makkah, Madinah, Dubai..." className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></Field>
          <Field label="Start date"><input type="date" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></Field>
          <Field label="End date"><input type="date" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></Field>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h2 className="font-bold text-slate-900">Travelers</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Counter label="Adults" value={travelers.adults} onChange={(value) => setTravelers({ ...travelers, adults: value })} />
            <Counter label="Children" value={travelers.children} min={0} onChange={(value) => setTravelers({ ...travelers, children: value })} />
            <Counter label="Infants" value={travelers.infants} min={0} onChange={(value) => setTravelers({ ...travelers, infants: value })} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Total Travelers: <span className="text-emerald-700">{total}</span></p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {["Flights", "Hotels", "Guide", "Visa", "Transfers", "Activities"].map((item) => <button key={item} type="button" className="rounded-2xl border border-slate-200 p-5 text-left hover:border-emerald-300 hover:bg-emerald-50/40"><p className="font-bold text-slate-800">{item}</p><p className="mt-1 text-xs text-slate-500">Configure custom {item.toLowerCase()} later in the workflow.</p></button>)}
        </div>
      </div>

      <div className="flex justify-end"><Button onClick={() => navigate("/admin/bookings/create")}>Continue to Booking</Button></div>
    </div>
  );
}
function Counter({ label, value, onChange, min = 1 }) { return <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">{label}</span><TravelerCount value={value} min={min} onChange={onChange} /></div></div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }
