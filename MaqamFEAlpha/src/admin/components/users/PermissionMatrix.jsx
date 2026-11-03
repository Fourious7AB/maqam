import { useMemo } from "react";

export default function PermissionMatrix({catalog=[],value=[],onChange,readOnly=false}){
  const groups=useMemo(()=>Object.entries(catalog.reduce((acc,item)=>{(acc[item.group]??=[]).push(item);return acc},{})),[catalog]);
  const has=(key)=>value.includes("*")||value.includes(key);
  const toggle=(key)=>{
    if(readOnly)return;
    const next=has(key)?value.filter(x=>x!==key):[...value,key];
    onChange(next);
  };
  return <div className="space-y-5">
    {groups.map(([group,items])=><section key={group} className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-800">{group}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item=><label key={item.key} className={`flex items-start gap-2 rounded-xl border p-3 ${has(item.key)?"border-emerald-200 bg-emerald-50/50":"border-slate-200"}`}>
          <input type="checkbox" disabled={readOnly||value.includes("*")} checked={has(item.key)} onChange={()=>toggle(item.key)} className="mt-0.5 h-4 w-4 accent-emerald-700"/>
          <span><span className="block text-xs font-semibold text-slate-700">{item.label}</span><code className="mt-1 block text-[10px] text-slate-400">{item.key}</code></span>
        </label>)}
      </div>
    </section>)}
  </div>
}
