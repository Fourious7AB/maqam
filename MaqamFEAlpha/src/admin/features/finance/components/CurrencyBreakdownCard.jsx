import { Globe2, ArrowRight, Layers } from "lucide-react";
import { formatMoney } from "../financeUtils";

export default function CurrencyBreakdownCard({
  byCurrency = [],
  activeCurrency = "ALL",
  onSelectCurrency,
}) {
  if (!Array.isArray(byCurrency) || byCurrency.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Globe2 size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Multi-Currency Portfolio Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Transactions processed across active currencies in your platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>{byCurrency.length} Active Currencies</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {byCurrency.map((item, idx) => {
          const isSelected = activeCurrency === item.currency;
          return (
            <div
              key={idx}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:ring-emerald-500/30"
                  : "border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-black tracking-wider text-slate-800 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {item.currency}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {item.totalTransactions} txns
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-400">Gross Inflow</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {formatMoney(item.grossRevenue, item.currency)}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-2.5 text-xs dark:border-slate-700/60">
                  <div>
                    <span className="block text-[11px] text-slate-400">Net Revenue</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.netRevenue, item.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Refunds</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {formatMoney(item.refunds, item.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {onSelectCurrency && (
                <button
                  type="button"
                  onClick={() => onSelectCurrency(isSelected ? "ALL" : item.currency)}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  }`}
                >
                  {isSelected ? "Filter Active (Clear)" : `Filter by ${item.currency}`}
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
