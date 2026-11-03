import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import InventoryMetric from "../../../components/inventory/InventoryMetric";
import { reportsApi } from "../reportsApi";
import formatCurrency from "../../../utils/formatCurrency";

export default function Reports(){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[exporting,setExporting]=useState(false);
 const load=async()=>{setLoading(true);try{setData(await reportsApi.getOverview())}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const exportReport=async()=>{setExporting(true);try{await reportsApi.exportCsv("overview")}finally{setExporting(false)}};
 if(loading)return <div className="rounded-2xl bg-white p-10 text-center">Loading reports...</div>;
 const maxRevenue=Math.max(...data.months.map(x=>x.revenue),1);
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title="Reports & Analytics" subtitle="Operational revenue, bookings, lead conversion and acquisition insights." actions={<><Button variant="secondary" onClick={load}><RefreshCw size={16}/>Refresh</Button><Button loading={exporting} onClick={exportReport}><Download size={16}/>Export</Button></>}/>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><InventoryMetric label="Bookings" value={data.bookings}/><InventoryMetric label="Revenue" value={formatCurrency(data.revenue)}/><InventoryMetric label="Open Leads" value={data.leads}/><InventoryMetric label="Conversion" value={`${data.conversion}%`}/></div>
  <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Revenue Trend</h2><p className="mt-1 text-xs text-slate-500">Monthly revenue and booking volume.</p><div className="mt-6 flex h-64 items-end gap-3">{data.months.map(m=><div key={m.label} className="flex flex-1 flex-col items-center gap-2"><div title={`₹${m.revenue}L`} className="w-full rounded-t-lg bg-emerald-500/80" style={{height:`${Math.max(8,(m.revenue/maxRevenue)*190)}px`}}/><span className="text-xs font-semibold text-slate-500">{m.label}</span><span className="text-[10px] text-slate-400">{m.bookings}</span></div>)}</div></section>
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Lead Sources</h2><p className="mt-1 text-xs text-slate-500">Share of acquired leads.</p><div className="mt-5 space-y-4">{data.channels.map(c=><div key={c.label}><div className="flex justify-between text-xs"><span className="font-semibold text-slate-700">{c.label}</span><span className="text-slate-400">{c.value}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${c.value}%`}}/></div></div>)}</div></section>
  </div>
 </div>
}
