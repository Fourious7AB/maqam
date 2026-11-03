import { ArrowDown, ArrowRight, ArrowUp, Pencil } from "lucide-react";
import { managementData } from "../../data/dashboardData";

function ManagementCard({ item }) {
  const Icon = item.icon;

  return (
    <div className="dashboard-card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${item.iconClass}`}
          >
            <Icon size={23} />
          </div>
          <h2 className="truncate text-[14px] font-bold text-slate-900">
            {item.title}
          </h2>
        </div>

        <button className="shrink-0 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
          View All
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {item.metrics.map(([label, value]) => (
          <div key={label}>
            <div className="text-[9px] text-slate-500">{label}</div>
            <div className="mt-1 text-[17px] font-bold text-slate-900">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-2 text-[11px] font-semibold text-slate-900">
        {item.tableTitle}
      </div>

      <div className="table-scroll">
        <table className="w-full min-w-[470px] border-collapse text-[10px]">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[9px] text-slate-500">
              {item.columns.map((column) => (
                <th key={column} className="px-4 py-2 font-medium">
                  {column}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {item.rows.map((row) => (
              <tr key={row[0]} className="border-b border-slate-100 last:border-0">
                {row.map((cell, index) => (
                  <td
                    key={`${row[0]}-${index}`}
                    className={`px-4 py-2.5 ${
                      index === 0
                        ? "font-medium text-slate-700"
                        : "font-semibold text-slate-800"
                    }`}
                  >
                    {cell}
                  </td>
                ))}

                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button className="grid h-6 w-6 place-items-center rounded-md border border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                      <ArrowUp size={11} />
                    </button>
                    <button className="grid h-6 w-6 place-items-center rounded-md border border-red-100 text-red-500 hover:bg-red-50">
                      <ArrowDown size={11} />
                    </button>
                    <button className="grid h-6 w-6 place-items-center rounded-md border border-blue-100 text-blue-600 hover:bg-blue-50">
                      <Pencil size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3 text-[11px] font-semibold text-blue-600 hover:bg-blue-50/50">
        {item.footer}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function ManagementGrid() {
  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
      {managementData.map((item) => (
        <ManagementCard key={item.title} item={item} />
      ))}
    </section>
  );
}
