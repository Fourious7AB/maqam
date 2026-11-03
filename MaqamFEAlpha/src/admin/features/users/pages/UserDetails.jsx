import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import Input from "../../../components/common/Input";
import RoleBadge from "../../../components/users/RoleBadge";
import PermissionMatrix from "../../../components/users/PermissionMatrix";
import { usersApi } from "../usersApi";

export default function UserDetails(){
 const {id}=useParams(),navigate=useNavigate();const [user,setUser]=useState(null),[catalog,setCatalog]=useState([]),[saving,setSaving]=useState(false);
 useEffect(()=>{Promise.all([usersApi.getById(id),usersApi.getPermissionCatalog()]).then(([u,c])=>{setUser(u);setCatalog(c.data||[])}).catch(()=>setUser(null))},[id]);
 if(!user)return <LoadingSpinner/>;
 const update=async()=>{setSaving(true);try{setUser(await usersApi.update(user.id,user))}finally{setSaving(false)}};
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title={user.name} subtitle={`${user.id} · User profile`} actions={<Button variant="secondary" onClick={()=>navigate("/admin/users")}><ArrowLeft size={16}/>Back</Button>}/>
  <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-700">{user.name[0]}</div><div><h2 className="font-black text-slate-900">{user.name}</h2><div className="mt-1"><RoleBadge role={user.role}/></div></div></div><div className="mt-5 space-y-4"><Input label="Name" value={user.name} onChange={e=>setUser({...user,name:e.target.value})}/><Input label="Email" value={user.email} onChange={e=>setUser({...user,email:e.target.value})}/><Input label="Phone" value={user.phone} onChange={e=>setUser({...user,phone:e.target.value})}/><Input label="Department" value={user.department} onChange={e=>setUser({...user,department:e.target.value})}/><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Status</span><select value={user.status} onChange={e=>setUser({...user,status:e.target.value})} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><Button loading={saving} onClick={update}><Save size={16}/>Save Changes</Button></div></section>
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Permission Matrix</h2><p className="mt-1 text-xs text-slate-500">Changes should be mirrored by backend authorization.</p><div className="mt-4"><PermissionMatrix catalog={catalog} value={user.permissions||[]} onChange={permissions=>setUser({...user,permissions})}/></div><div className="mt-4"><Button loading={saving} onClick={update}><Save size={16}/>Save Permissions</Button></div></section>
  </div>
 </div>
}
