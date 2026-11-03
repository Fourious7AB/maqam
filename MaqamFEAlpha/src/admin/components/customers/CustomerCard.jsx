import { ArrowRight, Mail, Phone, Users, Check } from "lucide-react";
import formatCurrency from "../../utils/formatCurrency";

export default function CustomerCard({ customer, onOpen, onViewTravellers }) {
  const initials = (customer.firstName?.[0] || customer.name?.[0] || "C").toUpperCase();
  const id = customer._id || customer.id;
  const isActive = customer.isActive !== false;
  const moneySpent = customer.totalMoneySpent ?? 0;
  const travellersCount = customer.totalTravellers ?? 0;
  const bookedOffersCount = customer.bookedOffersCount ?? 0;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {customer.avatar ? (
                <img
                  src={customer.avatar}
                  alt={customer.name}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-slate-900 text-sm dark:text-white line-clamp-1">
                  {customer.name}
                </h3>
                {customer.isVerified && (
                  <span title="Verified" className="text-emerald-600">
                    <Check size={12} className="stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {id.slice(-8)}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-slate-400"}`} />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Contact info */}
        <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <p className="flex items-center gap-1.5 truncate">
            <Phone size={12} className="text-slate-400 flex-none" />
            <span>{customer.phone || "No phone"}</span>
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="text-slate-400 flex-none" />
            <span className="truncate">{customer.email || "No email"}</span>
          </p>
        </div>

        {/* Metric strip */}
        <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 text-center dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="p-2">
            <p className="text-[10px] uppercase font-semibold text-slate-400">Travellers</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {travellersCount}
            </p>
          </div>
          <div className="p-2">
            <p className="text-[10px] uppercase font-semibold text-slate-400">Offers</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {bookedOffersCount}
            </p>
          </div>
          <div className="p-2">
            <p className="text-[10px] uppercase font-semibold text-slate-400">Spent</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-900 truncate dark:text-white">
              {formatCurrency(moneySpent)}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onViewTravellers && onViewTravellers(customer)}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Users size={12} />
          <span>Travellers</span>
        </button>
        <button
          type="button"
          onClick={() => onOpen && onOpen(customer)}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-700 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <span>360° Profile</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </article>
  );
}
