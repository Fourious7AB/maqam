import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import PermissionMatrix from "../../../components/users/PermissionMatrix";
import RoleBadge from "../../../components/users/RoleBadge";
import { usersApi } from "../usersApi";

export default function RolesPermissions(){
 const [roles,setRoles]=useState([]),[catalog,setCatalog]=useState([]),[selected,setSelected]=useState(null),[saving,setSaving]=useState(false);
 useEffect(()=>{Promise.all([usersApi.listRoles(),usersApi.getPermissionCatalog()]).then(([r,c])=>{setRoles(r.data||[]);setCatalog(c.data||[]);setSelected(r.data?.[0]||null)})},[]);
 const save=async()=>{if(!selected)return;setSaving(true);try{const updated=await usersApi.updateRole(selected.key,{permissions:selected.permissions});setRoles(r=>r.map(x=>x.key===updated.key?updated:x));setSelected(updated)}finally{setSaving(false)}};
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title="Roles & Permissions" subtitle="Define reusable permission sets for each staff role."/>
  <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
   <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">{roles.map(role=><button key={role.key} onClick={()=>setSelected(role)} className={`w-full rounded-xl p-4 text-left ${selected?.key===role.key?"bg-emerald-50":"hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><RoleBadge role={role.key}/><span className="text-xs text-slate-400">{role.users} users</span></div><p className="mt-2 text-sm font-bold text-slate-800">{role.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{role.description}</p></button>)}</aside>
   {selected&&<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.description}</p></div><Button loading={saving} onClick={save}><Save size={16}/>Save Role</Button></div><div className="mt-5"><PermissionMatrix catalog={catalog} value={selected.permissions} readOnly={selected.permissions.includes("*")} onChange={permissions=>setSelected({...selected,permissions})}/></div></section>}
  </div>
 </div>
}
