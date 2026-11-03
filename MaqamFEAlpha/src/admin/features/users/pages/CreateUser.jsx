import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import PermissionMatrix from "../../../components/users/PermissionMatrix";
import RoleBadge from "../../../components/users/RoleBadge";
import { usersApi } from "../usersApi";

const initial={name:"",email:"",phone:"",department:"Sales",role:"sales_agent",permissions:[]};

export default function CreateUser(){
 const navigate=useNavigate();const [form,setForm]=useState(initial),[catalog,setCatalog]=useState([]),[roles,setRoles]=useState([]),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{Promise.all([usersApi.getPermissionCatalog(),usersApi.listRoles()]).then(([p,r])=>{setCatalog(p.data||[]);setRoles(r.data||[])})},[]);
 const updateRole=(role)=>{const found=roles.find(r=>r.key===role);setForm(x=>({...x,role,permissions:found?.permissions?.includes("*")?["*"]:[...(found?.permissions||[])]}))};
 const save=async()=>{setSaving(true);setMessage("");try{const user=await usersApi.create(form);navigate(`/admin/users/${user.id}`)}catch(e){setMessage(e.message||"Unable to create user.")}finally{setSaving(false)}};
 return <div className="space-y-5 animate-slide-in">
  <PageHeader title="Create User" subtitle="Create a staff account and assign a role." actions={<Button variant="secondary" onClick={()=>navigate("/admin/users")}><ArrowLeft size={16}/>Back</Button>}/>
  {message&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>}
  <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Account</h2><div className="mt-4 space-y-4"><Input label="Full Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><Input label="Department" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Role</span><select value={form.role} onChange={e=>updateRole(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">{roles.map(r=><option key={r.key} value={r.key}>{r.name}</option>)}</select></label><div className="pt-2"><RoleBadge role={form.role}/></div></div></section>
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Permissions</h2><p className="mt-1 text-xs text-slate-500">Adjust the permission set inherited from the selected role.</p></div></div><div className="mt-4"><PermissionMatrix catalog={catalog} value={form.permissions} onChange={permissions=>setForm({...form,permissions})}/></div><div className="mt-5 flex justify-end"><Button loading={saving} disabled={!form.name||!form.email} onClick={save}>Create User</Button></div></section>
  </div>
 </div>
}
