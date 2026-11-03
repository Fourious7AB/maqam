import { ArrowRight, BadgeCheck, CalendarDays, Hotel, ImageOff, Loader2, MapPin, Plane, Ticket, Users } from "lucide-react";
import PackageStatus from "./PackageStatus";
import formatCurrency from "../../utils/formatCurrency";

// List card for GET /api/v1/crm/packages rows. Every field has a fallback so
// packages created before a feature shipped still render correctly.
export default function PackageCard({ packageItem, onOpen, onToggle, toggling = false }) {
  const pkg = packageItem ?? {};
  const cover = (pkg.images ?? []).find((url) => typeof url === "string" && url);
  const breakdown = pkg.priceBreakdown ?? [];
  const flights = breakdown.filter((item) => item.itemType === "flight");
  const hotels = breakdown.filter((item) => item.itemType === "hotel");
  const others = breakdown.filter((item) => item.itemType !== "flight" && item.itemType !== "hotel");
  const margin = pkg.profitMarginPercentage;

  const nights = pkg.nights ?? hotels[0]?.details?.hotelDetails?.totalNights ?? null;
  const days = pkg.durationDays ?? (nights ? Number(nights) + 1 : null);

  return (
    <article
      onClick={() => onOpen(pkg)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="h-40 w-full overflow-hidden border-b border-slate-100 bg-slate-100">
        {cover ? (
          <img
            src={cover}
            alt={pkg.title || "Package"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">{pkg.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} />
              {pkg.destination || "Unknown destination"}
              {days ? ` · ${days}D${nights ? `/${nights}N` : ""}` : ""}
            </p>
          </div>
          <PackageStatus status={pkg.isActive === false ? "inactive" : pkg.status ?? "active"} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {pkg.guideActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              <BadgeCheck size={11} />Guide included
            </span>
          )}
          {pkg.bundleDiscountPercentage > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {pkg.bundleDiscountPercentage}% discount
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {flights.slice(0, 2).map((item) => (
            <span key={item.id ?? item.refId} className="inline-flex max-w-full items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              <Plane size={11} className="shrink-0" />
              <span className="truncate">{item.title}</span>
            </span>
          ))}
          {hotels.slice(0, 2).map((item) => (
            <span key={item.id ?? item.refId} className="inline-flex max-w-full items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <Hotel size={11} className="shrink-0" />
              <span className="truncate">{item.title}</span>
            </span>
          ))}
          {others.slice(0, 2).map((item) => (
            <span key={item.id ?? item.refId} className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Ticket size={11} className="shrink-0" />
              <span className="truncate">{item.title}</span>
            </span>
          ))}
          {breakdown.length === 0 && (
            <span className="text-[11px] text-slate-400">No components</span>
          )}
        </div>

        <div className="mb-3 mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Sell price</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(pkg.sellPrice)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Margin</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-700">
              {margin != null && margin !== "" ? `${Number(margin).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Slots</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-slate-900">
              <Users size={12} />
              {pkg.availableSlots ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {pkg.validity?.to
              ? `Valid to ${new Date(pkg.validity.to).toLocaleDateString()}`
              : pkg.validityTo
                ? `Valid to ${pkg.validityTo}`
                : "No end date"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            View <ArrowRight size={13} />
          </span>
        </div>
        {onToggle && (
          <button
            type="button"
            disabled={toggling}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(pkg);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
          >
            {toggling && <Loader2 size={14} className="animate-spin" />}
            {pkg.isActive === false ? "Activate package" : "Deactivate package"}
          </button>
        )}
      </div>
    </article>
  );
}
