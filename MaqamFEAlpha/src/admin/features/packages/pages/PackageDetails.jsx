import { useEffect, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Edit3, Globe, Hotel, Images,
  MapPin, Percent, Plane, Receipt, Ticket, Users, X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import PackageStatus from "../../../components/packages/PackageStatus";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import CrmImageUploadSection from "../../../components/common/CrmImageUploadSection";
import formatCurrency from "../../../utils/formatCurrency";
import { packagesApi } from "../packagesApi";

const fmtDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [managePhotosOpen, setManagePhotosOpen] = useState(false);

  const load = () =>
    packagesApi.getById(id)
      .then(setPkg)
      .catch(() => setPkg(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!pkg) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-slate-700">Package not found</p>
        <Button variant="secondary" onClick={() => navigate("/admin/packages")}>Back to Packages</Button>
      </div>
    );
  }

  const breakdown = pkg.priceBreakdown ?? [];
  const cover = (pkg.images ?? []).find((url) => typeof url === "string" && url);
  const margin = pkg.profitMarginPercentage ?? (pkg.totalCostPrice && pkg.sellPrice ? ((pkg.grossProfit / pkg.sellPrice) * 100).toFixed(1) : null);
  const unbundledTotal = breakdown.reduce((sum, item) => sum + Number(item.totalRetail ?? item.retailPrice ?? 0), 0);

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title={pkg.title}
        subtitle={`${pkg.destination ? `${pkg.destination} · ` : ""}${breakdown.length} components`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/admin/packages")}><ArrowLeft size={16} />Back</Button>
            <Button variant="secondary" onClick={() => setManagePhotosOpen(true)}><Images size={16} />Manage Photos</Button>
            <Button onClick={() => navigate(`/admin/packages/${pkg.id || pkg._id || id}/edit`)}><Edit3 size={16} />Edit Package</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-5">
          {/* Header — cover image beside the package identity */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-6 sm:flex-row">
              {cover ? (
                <img
                  src={cover}
                  alt={pkg.title}
                  className="h-40 w-full shrink-0 rounded-xl border border-slate-200 object-cover sm:w-64"
                />
              ) : (
                <div className="grid h-40 w-full shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300 sm:w-64">
                  <Globe size={28} strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">{pkg.title}</h1>
                    {pkg.destination && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14} />{pkg.destination}</p>
                    )}
                  </div>
                  {pkg.isActive !== undefined ? (
                    <PackageStatus status={pkg.isActive ? "active" : "inactive"} />
                  ) : pkg.availableSlots != null ? (
                    <PackageStatus status={pkg.availableSlots > 0 ? "active" : "sold_out"} />
                  ) : null}
                </div>
                {pkg.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{pkg.description}</p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {pkg.sellPrice != null && <Info label="Sell price" value={formatCurrency(pkg.sellPrice)} />}
                  {pkg.availableSlots != null && <Info label="Available slots" value={pkg.availableSlots} />}
                  {pkg.bundleDiscountPercentage != null && <Info label="Bundle discount" value={`${pkg.bundleDiscountPercentage}%`} />}
                  {pkg.isPublic !== undefined && <Info label="Visibility" value={pkg.isPublic === false ? "Private" : "Public"} />}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                {(pkg.images ?? []).length > 0 ? (
                  pkg.images.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={`${pkg.title} ${index + 1}`}
                      className="h-20 w-28 cursor-pointer rounded-xl border border-slate-200 object-cover transition hover:opacity-90 dark:border-slate-700"
                      onClick={() => setManagePhotosOpen(true)}
                      loading="lazy"
                    />
                  ))
                ) : (
                  <p className="text-xs italic text-slate-500">
                    No custom images uploaded. Customer portal automatically falls back to bundled hotel and flight photos!
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setManagePhotosOpen(true)}
                className="shrink-0"
              >
                <Images size={14} />
                <span>{(pkg.images ?? []).length > 0 ? "Manage Gallery" : "Upload Photos"}</span>
              </Button>
            </div>
          </div>

          {/* Guide bundle */}
          {(pkg.guideActive || pkg.guidePrice || pkg.guideLocation) && (
            <Section title="Guide" icon={BadgeCheck}>
              {pkg.guideActive ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                    <BadgeCheck size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">Guide included with this package</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      {pkg.guideLocation && (
                        <span className="inline-flex items-center gap-1"><MapPin size={12} />{pkg.guideLocation}</span>
                      )}
                      {Number(pkg.guidePrice) > 0 && (
                        <span className="inline-flex items-center gap-1"><Receipt size={12} />{formatCurrency(pkg.guidePrice)} per booking</span>
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Active</span>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Guide is configured but not active on this package.</p>
              )}
            </Section>
          )}

          {/* Included offers — flight & hotel components with live stock details */}
          <Section title="Included offers" icon={Ticket}>
            {breakdown.length ? (
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <OfferRow key={item.id ?? item.refId ?? item.offer} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No components on this package.</p>
            )}
          </Section>

          {/* Itinerary */}
          {(pkg.itinerary ?? []).length > 0 && (
            <Section title="Itinerary" icon={MapPin}>
              <div className="space-y-4">
                {pkg.itinerary.map((day) => (
                  <div key={day.day ?? day.title} className="flex gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">{day.day}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{day.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{day.description}</p>
                      {(day.assignedOffers ?? []).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {day.assignedOffers.map((entry, index) => (
                            <span key={`${entry.offer}-${index}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {entry.role ?? "activity"}{entry.notes ? ` · ${entry.notes}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Inclusions */}
          {(pkg.inclusions ?? []).length > 0 && (
            <Section title="Inclusions" icon={Globe}>
              <div className="flex flex-wrap gap-2">
                {pkg.inclusions.map((item) => (
                  <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{item}</span>
                ))}
              </div>
            </Section>
          )}
        </section>

        <aside className="space-y-5">
          <Section title="Pricing summary" icon={Users}>
            <div className="space-y-3">
              {pkg.sellPrice != null && <Info label="Package sell price" value={formatCurrency(pkg.sellPrice)} />}
              {unbundledTotal > 0 && <Info label="Unbundled total" value={formatCurrency(unbundledTotal)} />}
              {pkg.bundleDiscountPercentage > 0 && (
                <Info label="Bundle discount" value={`${pkg.bundleDiscountPercentage}%`} />
              )}
              {pkg.totalCostPrice != null && (
                <Info label="Total cost" value={formatCurrency(pkg.totalCostPrice)} />
              )}
              {pkg.costPrice != null && pkg.totalCostPrice == null && (
                <Info label="Cost price" value={formatCurrency(pkg.costPrice)} />
              )}
              {pkg.grossProfit != null && (
                <Info label="Gross profit" value={formatCurrency(pkg.grossProfit)} />
              )}
              {margin != null && (
                <Info label="Profit margin" value={`${Number(margin).toFixed(2)}%`} />
              )}
            </div>
          </Section>

          {(pkg.validity?.from || pkg.validity?.to) && (
            <Section title="Validity" icon={Percent}>
              <div className="space-y-3">
                {pkg.validity?.from && <Info label="From" value={new Date(pkg.validity.from).toLocaleDateString()} />}
                {pkg.validity?.to && <Info label="To" value={new Date(pkg.validity.to).toLocaleDateString()} />}
              </div>
            </Section>
          )}
        </aside>
      </div>

      {/* Photos Management Modal Dialog */}
      {managePhotosOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setManagePhotosOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Images size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Manage Package Photos & Gallery
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pkg.title} · Live Cloudinary synchronization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagePhotosOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <CrmImageUploadSection
                images={pkg.images || []}
                onChange={(newImages) => setPkg((prev) => ({ ...prev, images: newImages }))}
                section="packages"
                itemId={pkg.id || pkg._id}
                maxImages={10}
                title="Package Media Gallery"
                subtitle="Upload new photos or remove existing ones. Images are synced live to the database."
                showCustomerNotice={true}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/80">
              <Button onClick={() => setManagePhotosOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One component (flight / hotel / other) with its live stock snapshot from
// priceBreakdown[].details.flightDetails / hotelDetails.
function OfferRow({ item }) {
  const isFlight = item.itemType === "flight";
  const isHotel = item.itemType === "hotel";
  const flight = item.details?.flightDetails ?? null;
  const hotel = item.details?.hotelDetails ?? null;
  const Icon = isFlight ? Plane : isHotel ? Hotel : Ticket;
  const tone = isFlight ? "bg-sky-100 text-sky-700" : isHotel ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-slate-800">{item.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                {isFlight ? "Flight" : isHotel ? "Hotel" : item.itemType ?? "Offer"}
              </span>
              {item.isOptional && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Optional</span>
              )}
              {item.unitsPerBooking != null && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                  {item.unitsPerBooking} / booking
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {item.retailPrice != null && (
            <p className="text-sm font-bold text-slate-800">{formatCurrency(item.retailPrice)}</p>
          )}
          {item.totalRetail != null && Number(item.totalRetail) !== Number(item.retailPrice) && (
            <p className="text-[11px] text-slate-400">× {item.unitsPerBooking ?? 1} = {formatCurrency(item.totalRetail)}</p>
          )}
        </div>
      </div>

      {/* Live flight snapshot - only rendered if fields exist */}
      {flight && (
        <div className="mt-3 grid gap-2 rounded-lg border border-sky-100 bg-white p-3 text-xs sm:grid-cols-3">
          {(flight.airline || flight.flightNumber) && (
            <Detail label="Airline" value={`${flight.airline ?? ""} ${flight.flightNumber ?? ""}`.trim()} />
          )}
          {(flight.origin || flight.destination) && (
            <Detail label="Route" value={`${flight.origin ?? ""} → ${flight.destination ?? ""}`} />
          )}
          {flight.cabinClass && <Detail label="Cabin" value={flight.cabinClass} />}
          {flight.departureDate && <Detail label="Departure" value={fmtDate(flight.departureDate)} />}
          {flight.arrivalDate && <Detail label="Arrival" value={fmtDate(flight.arrivalDate)} />}
          {flight.pnr && <Detail label="PNR" value={flight.pnr} />}
          {(flight.availableUnits != null || flight.totalUnits != null) && (
            <Detail label="Seats available" value={`${flight.availableUnits ?? 0} / ${flight.totalUnits ?? 0}`} />
          )}
          {flight.nameAdditionDeadline && <Detail label="Name deadline" value={fmtDate(flight.nameAdditionDeadline)} />}
          {Number(flight.costPerUnit) > 0 && <Detail label="Cost / seat" value={formatCurrency(flight.costPerUnit)} />}
        </div>
      )}

      {/* Live hotel snapshot - only rendered if fields exist */}
      {hotel && (
        <div className="mt-3 grid gap-2 rounded-lg border border-amber-100 bg-white p-3 text-xs sm:grid-cols-3">
          {(hotel.hotelName || hotel.hotelId?.name) && (
            <Detail label="Hotel" value={hotel.hotelName ?? hotel.hotelId?.name} />
          )}
          {hotel.roomType && <Detail label="Room" value={hotel.roomType} />}
          {hotel.destination && <Detail label="City" value={hotel.destination} />}
          {hotel.checkIn && <Detail label="Check-in" value={fmtDate(hotel.checkIn)} />}
          {hotel.checkOut && <Detail label="Check-out" value={fmtDate(hotel.checkOut)} />}
          {hotel.totalNights != null && <Detail label="Nights" value={hotel.totalNights} />}
          {(hotel.availableUnits != null || hotel.totalUnits != null) && (
            <Detail label="Rooms available" value={`${hotel.availableUnits ?? 0} / ${hotel.totalUnits ?? 0}`} />
          )}
          {Number(hotel.pricePerNight) > 0 && <Detail label="Price / night" value={formatCurrency(hotel.pricePerNight)} />}
          {hotel.reservationRef && <Detail label="Reservation" value={hotel.reservationRef} />}
          {hotel.reviewStatus && <Detail label="Status" value={hotel.reviewStatus} />}
          {(hotel.meals ?? []).length > 0 && (
            <Detail label="Meals" value={hotel.meals.join(", ")} />
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  if (value == null || value === "" || value === "—" || value === "undefined" || value === "null") return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-700" title={String(value ?? "")}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children }) { const Icon = icon; return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={16} /></span><h2 className="font-bold text-slate-900">{title}</h2></div><div className="mt-4">{children}</div></section>; }
function Info({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>; }
