import { useEffect, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import InventoryTable from "../../../components/inventory/InventoryTable";
import RoleBadge from "../../../components/users/RoleBadge";
import StatusBadge from "../../../components/common/StatusBadge";
import { usersApi } from "../usersApi";

export default function Users(){
 const navigate=useNavigate();const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(""),[role,setRole]=useState("staff"),[status,setStatus]=useState("all");
 const load=async()=>{setLoading(true);try{setRows((await usersApi.list({search,role,status})).data||[])}finally{setLoading(false)}};
 useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t)},[search,role,status]);
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title="Users & Staff" subtitle="Manage staff accounts, roles and access." actions={<><Button variant="secondary" onClick={load}><RefreshCw size={16}/>Refresh</Button><Button onClick={()=>navigate("/admin/users/create")}><Plus size={16}/>Create User</Button></>}/>
  <div className="grid gap-3 md:grid-cols-[1fr_180px_180px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm"/></div><select value={role} onChange={e=>setRole(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="staff">All Staff (Default)</option><option value="customer">Customer</option><option value="admin">Admin</option><option value="sales_agent">Sales Agent</option><option value="finance">Finance</option><option value="hotelier">Hotelier</option><option value="all">All roles</option></select><select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
  {loading?<div className="rounded-2xl bg-white p-10 text-center text-sm">Loading staff...</div>:<InventoryTable rows={rows} columns={[
   {key:"name",label:"Staff",render:r=><div><button onClick={()=>navigate(`/admin/users/${r.id}`)} className="font-bold text-emerald-700">{r.name}</button><p className="text-xs text-slate-400">{r.email}</p></div>},
   {key:"role",label:"Role",render:r=><RoleBadge role={r.role}/>},
   {key:"department",label:"Department"},
   {key:"status",label:"Status",render:r=><StatusBadge status={r.status} variant={r.status==="active"?"success":"default"}/>},
   {key:"lastLogin",label:"Last Login"},
   {key:"permissions",label:"Permissions",render:r=>r.permissions.includes("*")?"All":r.permissions.length}
  ]}/>}
 </div>
}
