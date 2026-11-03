import { useState } from "react";
import {
  Search,
  Filter,
  X,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  SUPPORTED_CURRENCIES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  BOOKING_TYPES,
  REFUND_STATUSES,
} from "../financeUtils";

export default function FinanceFilters({
  type = "transactions", // "transactions" | "refunds" | "overview"
  search = "",
  onSearchChange,
  currency = "ALL",
  onCurrencyChange,
  status = "ALL",
  onStatusChange,
  paymentMethod = "ALL",
  onPaymentMethodChange,
  bookingType = "ALL",
  onBookingTypeChange,
  startDate = "",
  onStartDateChange,
  endDate = "",
  onEndDateChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onReset,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Quick Date Presets
  const applyPreset = (preset) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toYMD = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "all") {
      onStartDateChange("");
      onEndDateChange("");
      return;
    }

    if (preset === "today") {
      const ymd = toYMD(today);
      onStartDateChange(ymd);
      onEndDateChange(ymd);
      return;
    }

    if (preset === "7days") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      onStartDateChange(toYMD(start));
      onEndDateChange(toYMD(today));
      return;
    }

    if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onStartDateChange(toYMD(start));
      onEndDateChange(toYMD(end));
      return;
    }

    if (preset === "thisYear") {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      onStartDateChange(toYMD(start));
      onEndDateChange(toYMD(end));
      return;
    }
  };

  const hasActiveFilters =
    Boolean(search) ||
    currency !== "ALL" ||
    status !== "ALL" ||
    paymentMethod !== "ALL" ||
    bookingType !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                type === "refunds"
                  ? "Search by refund ID, reason, or customer..."
                  : "Search transaction ID, order ID, customer name..."
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Quick Dropdowns & Action Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Filter */}
          {onCurrencyChange && (
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Currencies</option>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          {onStatusChange && (
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              {(type === "refunds" ? REFUND_STATUSES : PAYMENT_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>
          )}

          {/* Toggle Advanced Filters Tray */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              showAdvanced || hasActiveFilters
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            }`}
          >
            <Filter size={14} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">
                !
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Drawer / Section */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 dark:border-slate-800 text-xs">
          {/* Booking Type */}
          {onBookingTypeChange && (
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-400">
                Booking Type
              </label>
              <select
                value={bookingType}
                onChange={(e) => onBookingTypeChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Types</option>
                {BOOKING_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Gateway */}
          {onPaymentMethodChange && (
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-400">
                Payment Gateway
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Gateways</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          {onStartDateChange && (
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-400">
                Start Date (From)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          {/* End Date */}
          {onEndDateChange && (
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-400">
                End Date (To)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          {/* Sort By & Order */}
          {onSortByChange && (
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-400">
                Sort Ledger
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="amount">Amount</option>
                  <option value="paidAt">Paid Date</option>
                  <option value="updatedAt">Updated At</option>
                  {type === "refunds" && (
                    <>
                      <option value="requestedAt">Requested Date</option>
                      <option value="processedAt">Processed Date</option>
                    </>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    onSortOrderChange(sortOrder === "desc" ? "asc" : "desc")
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors"
                  title={`Order: ${sortOrder?.toUpperCase()}`}
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets Bar */}
          <div className="col-span-full flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 mr-1">
              Date Presets:
            </span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "7days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "thisYear", label: "Year to Date" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
