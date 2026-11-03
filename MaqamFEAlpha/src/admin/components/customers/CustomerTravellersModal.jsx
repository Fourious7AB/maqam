import { useEffect, useState } from "react";
import { X, RefreshCw, Phone, Mail, AlertCircle } from "lucide-react";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import TravelerTable from "./TravelerTable";
import { customersApi } from "../../features/customers/customersApi";

export default function CustomerTravellersModal({ customerId, customerName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await customersApi.getTravellers(customerId);
      setData(res);
    } catch (err) {
      console.error("Failed to load customer travellers:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load traveler details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  if (!customerId) return null;

  const customer = data?.customer;
  const travellers = data?.travellers || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="travellers-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/60">
          <div>
            <h2 id="travellers-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
              Saved Travellers & Family Dossier
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customer?.name || customerName || "Customer"} · ID:{" "}
              <span className="font-mono text-[11px]">{customerId}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Customer contact strip */}
        {customer && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Primary: {customer.name}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} className="text-slate-400" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail size={11} className="text-slate-400" />
                  {customer.email}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {data?.totalTravellers ?? travellers.length} Saved Profiles
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center">
              <LoadingSpinner />
              <p className="mt-2 text-xs text-slate-400">Loading live traveler records…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle size={20} className="mx-auto mb-1 text-red-500" />
              <p className="font-semibold">{error}</p>
              <Button variant="secondary" className="mt-2 !py-1 !px-2.5 text-xs" onClick={load}>
                <RefreshCw size={12} /> Retry
              </Button>
            </div>
          ) : (
            <TravelerTable travelers={travellers} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-2.5 border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/60">
          <Button variant="secondary" onClick={onClose} className="!py-1.5 !px-3 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
