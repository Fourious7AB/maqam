import { useState } from "react";
import Modal from "./Modal";
import { env } from "../../config/env";
import { dataSourceRegistry, dataSourceMeta, getDataSourceTotals } from "../../config/dataSource";

// Badge showing whether the app is currently rendering mock data or live API
// data. On click it opens a table documenting every CRM data slice: what the
// data is, its end use, which endpoints back it (method + path + purpose),
// and its status (Live = wired to the real API, Mock = real API with local
// fallback, Planned = not implemented yet).
// Reads env.useMockApi on every render, so flipping VITE_USE_MOCK_API in
// .env and reloading updates every badge automatically.
export default function DataSourceBadge({ className = "" }) {
  const [showTable, setShowTable] = useState(false);
  const isMock = env.useMockApi;
  const totals = getDataSourceTotals();

  const sliceChip = (status) => {
    if (status === "missing") {
      return (
        <span
          className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600"
          title="Planned but not implemented yet — must be added to complete the CRM"
        >
          Planned
        </span>
      );
    }
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status === "mock" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
        {status === "mock" ? "Mock branch" : "Live"}
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTable(true)}
        title={
          isMock
            ? "The app is showing mock data. Click to see the full data source breakdown."
            : "The app is reading from the live backend API. Click to see the full data source breakdown."
        }
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80 ${
          isMock
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        } ${className}`}
      >
        <span className="relative flex h-2 w-2">
          {isMock ? (
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          ) : (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </>
          )}
        </span>
        {isMock ? "Mock data" : "Live data"}
      </button>

      <Modal open={showTable} title="Data sources — CRM breakdown" onClose={() => setShowTable(false)}>
        <p className="mb-3 text-xs leading-5 text-slate-500">
          Mock mode is {isMock ? <span className="font-semibold text-amber-600">ON</span> : <span className="font-semibold text-emerald-600">OFF</span>}.
          Toggle with <code className="rounded bg-slate-100 px-1">{dataSourceMeta.mockFlag}</code> in <code className="rounded bg-slate-100 px-1">.env</code>.
          Registry updated {dataSourceMeta.updatedAt}.
        </p>

        <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{totals.slices} data slices</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{totals.live} live</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{totals.mock} mock branch</span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">{totals.missing} planned</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{totals.endpoints} endpoints</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Group</th>
                <th className="px-3 py-2 font-semibold">Method</th>
                <th className="px-3 py-2 font-semibold">Endpoint</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataSourceRegistry.map((slice) => (
                <SliceRows key={slice.key} slice={slice} chip={sliceChip(slice.status)} />
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

// One slice = a spanning header row (feature, data, end use, module) followed
// by one row per endpoint.
function SliceRows({ slice, chip }) {
  return (
    <>
      <tr className="bg-slate-50/80">
        <td colSpan={4} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">{slice.feature}</span>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {slice.group}
            </span>
            {chip}
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            <span className="font-semibold text-slate-600">Data:</span> {slice.data}
          </p>
          <p className="text-[11px] leading-4 text-slate-500">
            <span className="font-semibold text-slate-600">End use:</span> {slice.endUse}
          </p>
          <p className="font-mono text-[10px] leading-4 text-slate-400">{slice.file}</p>
        </td>
      </tr>
      {(slice.endpoints || []).map((endpoint) => (
        <tr key={`${slice.key}-${endpoint.method}-${endpoint.path}`} className="hover:bg-slate-50/60">
          <td className="px-3 py-1.5" />
          <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-500">{endpoint.method}</td>
          <td className="px-3 py-1.5">
            <span className="font-mono text-[11px] text-slate-700">{endpoint.path}</span>
            {endpoint.note ? <span className="ml-2 text-[10px] text-slate-400">{endpoint.note}</span> : null}
          </td>
          <td className="px-3 py-1.5" />
        </tr>
      ))}
    </>
  );
}
