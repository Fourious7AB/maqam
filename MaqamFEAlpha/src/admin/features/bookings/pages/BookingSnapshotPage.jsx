import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { bookingsApi } from "../bookingsApi";
import formatCurrency from "../../../utils/formatCurrency";

export default function BookingSnapshotPage(){
 const {id}=useParams(),navigate=useNavigate();const [booking,setBooking]=useState(null);
 useEffect(()=>{bookingsApi.getById(id).then(setBooking).catch(()=>setBooking(null))},[id]);
 if(!booking)return <LoadingSpinner/>;
 const snap=booking.packageSnapshot||{};
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title="Booking Snapshot" subtitle={`${booking.bookingNumber} · Historical immutable package state`} actions={<Button variant="secondary" onClick={()=>navigate(`/admin/bookings/${id}`)}><ArrowLeft size={16}/>Back to Booking</Button>}/>
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-700"/><div><p className="font-bold text-emerald-900">Historical snapshot</p><p className="mt-1 text-xs leading-5 text-emerald-800">This view represents the package configuration captured at booking confirmation rather than today's live package configuration.</p></div></div>
  <div className="grid gap-5 lg:grid-cols-2">
   <Section title="Package"><Item label="Title" value={snap.title}/><Item label="Destination" value={snap.destination}/><Item label="Duration" value={snap.durationDays?`${snap.durationDays} days`:"—"}/><Item label="Snapshot version" value={snap.itineraryVersion||"—"}/></Section>
   <Section title="Historical Pricing"><Item label="Original package price" value={formatCurrency(snap.sellPrice||0)}/><Item label="Booking total" value={formatCurrency(booking.pricing?.total||0)}/><Item label="Travelers" value={booking.travelers?.length||0}/></Section>
  </div>
  <Section title="Snapshot JSON"><pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify({packageSnapshot:snap,pricing:booking.pricing,travelers:booking.travelers},null,2)}</pre></Section>
 </div>
}
function Section({title,children}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><FileText size={16}/></span><h2 className="font-bold text-slate-900">{title}</h2></div><div className="mt-4 space-y-3">{children}</div></section>}
function Item({label,value}){return <div className="flex justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-800">{value||"—"}</span></div>}
