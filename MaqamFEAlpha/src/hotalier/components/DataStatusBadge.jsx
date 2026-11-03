import { useState } from "react";
import Modal from "./Modal";
import { dataStatusRegistry, dataStatusMeta, getDataStatusTotals } from "../services/dataStatus";

// Clickable data-status indicator for the hotelier portal. The badge shows
// the current overall state (Live data when any live section is mounted and
// mock mode is off); clicking it opens a table that documents every portal
// section: its endpoints (copied verbatim from the contract docs) and whether
// the UI reads live backend data or the doc seed (mock / planned).
export default function DataStatusBadge({ apiMode = true }) {
  const [showTable, setShowTable] = useState(false);
  const totals = getDataStatusTotals();

  const chip = (status) => {
    if (status === "planned") {
      return (
        <span
          className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600"
          title="In the contract but the backend has not shipped it yet"
        >
          Planned
        </span>
      );
    }
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          status === "mock"
            ? "bg-amber-50 text-amber-700"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {status === "mock" ? "Mock seed" : "Live"}
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTable(true)}
        title="Which sections read live data and which use the doc seed. Click for the full breakdown."
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition hover:opacity-80 ${
          apiMode
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-slate-100 text-slate-500 ring-slate-200"
        }`}
      >
        <span className="relative flex h-1.5 w-1.5">
          {apiMode ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </>
          ) : (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
          )}
        </span>
        {apiMode ? "Live data" : "Sample data"}
      </button>

      {showTable && (
        <Modal
          title="Data status, live portal endpoints"
          subtitle="Active backend endpoints wired to the hotelier portal."
          onClose={() => setShowTable(false)}
          maxWidth="max-w-3xl"
        >
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{totals.slices} sections</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{totals.live} live</span>
            {totals.mock > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{totals.mock} mock seed</span>
            )}
            {totals.planned > 0 && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">{totals.planned} planned</span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{totals.endpoints} endpoints</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Group</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataStatusRegistry.map((slice) => (
                  <SliceRows key={slice.key} slice={slice} chip={chip(slice.status)} />
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}

function SliceRows({ slice, chip }) {
  return (
    <>
      <tr className="bg-slate-50/80">
        <td colSpan={3} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">{slice.feature}</span>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {slice.group}
            </span>
            {chip}
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">{slice.data}</p>
          <p className="font-mono text-[10px] leading-4 text-slate-400">{slice.file}</p>
        </td>
      </tr>
      {(slice.endpoints || []).map((endpoint) => (
        <tr key={`${slice.key}-${endpoint.method}-${endpoint.path}`} className="hover:bg-slate-50/60">
          <td className="px-3 py-1.5" />
          <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-500">
            {endpoint.method}
          </td>
          <td className="px-3 py-1.5">
            <span className="font-mono text-[11px] text-slate-700">{endpoint.path}</span>
            {endpoint.note ? <span className="ml-2 text-[10px] text-slate-400">{endpoint.note}</span> : null}
          </td>
        </tr>
      ))}
      {!slice.endpoints?.length && (
        <tr>
          <td className="px-3 py-1.5" />
          <td className="px-3 py-1.5 font-mono text-[11px] text-slate-400" colSpan={2}>
            No backend endpoint in the contract yet
          </td>
        </tr>
      )}
    </>
  );
}
