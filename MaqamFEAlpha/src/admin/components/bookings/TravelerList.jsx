import { UserRound, Plus, Trash2 } from "lucide-react";
import Input from "../common/Input";
import Button from "../common/Button";

const blank=()=>({firstName:"",lastName:"",dateOfBirth:"",gender:"",passportNumber:"",nationality:"Indian",phone:"",email:"",type:"adult"});

export function newTraveler(){ return blank(); }

export default function TravelerList({travelers,onChange}){
  const update=(index,key,value)=>onChange(travelers.map((t,i)=>i===index?{...t,[key]:value}:t));
  const add=()=>onChange([...travelers,blank()]);
  const remove=(index)=>onChange(travelers.filter((_,i)=>i!==index));

  return <div className="space-y-4">
    {travelers.map((t,index)=>(
      <div key={index} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={16}/></span><div><p className="font-bold text-slate-800">Traveler {index+1}</p><p className="text-xs text-slate-400">Traveler profile</p></div></div>
          {travelers.length>1&&<button onClick={()=>remove(index)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Input label="First Name" value={t.firstName} onChange={e=>update(index,"firstName",e.target.value)}/>
          <Input label="Last Name" value={t.lastName} onChange={e=>update(index,"lastName",e.target.value)}/>
          <Input label="Date of Birth" type="date" value={t.dateOfBirth} onChange={e=>update(index,"dateOfBirth",e.target.value)}/>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</span><select value={t.gender} onChange={e=>update(index,"gender",e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <Input label="Passport Number" value={t.passportNumber} onChange={e=>update(index,"passportNumber",e.target.value)}/>
          <Input label="Nationality" value={t.nationality} onChange={e=>update(index,"nationality",e.target.value)}/>
          <Input label="Phone" value={t.phone} onChange={e=>update(index,"phone",e.target.value)}/>
          <Input label="Email" type="email" value={t.email} onChange={e=>update(index,"email",e.target.value)}/>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Traveler Type</span><select value={t.type} onChange={e=>update(index,"type",e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option></select></label>
        </div>
      </div>
    ))}
    <Button variant="secondary" onClick={add}><Plus size={16}/>Add Traveler</Button>
  </div>
}
