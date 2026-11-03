export default function InventoryTable({ columns, rows, empty="No records found.", renderActions }) {
  if (!rows?.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{empty}</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
            <tr>{columns.map(c=><th key={c.key} className="px-4 py-3 font-bold">{c.label}</th>)}{renderActions&&<th className="px-4 py-3 text-right font-bold">Actions</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(row=>(
              <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                {columns.map(c=><td key={c.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{c.render?c.render(row):row[c.key]}</td>)}
                {renderActions&&<td className="px-4 py-3 text-right">{renderActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
