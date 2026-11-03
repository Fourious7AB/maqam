import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from "lucide-react";
import Button from "../common/Button";
import formatCurrency from "../../utils/formatCurrency";
import BasicDetails from "./steps/BasicDetails";
import OfferSelection from "./steps/OfferSelection";
import PricingDetails from "./steps/PricingDetails";
import ItineraryBuilder from "./steps/ItineraryBuilder";
import { packagesApi } from "../../features/packages/packagesApi";

const steps = ["Basic", "Offers", "Pricing", "Itinerary", "Review"];

const normalize = (initial = {}) => {
  const data = initial ?? {};
  const rawOffers =
    (Array.isArray(data.priceBreakdown) && data.priceBreakdown.length > 0)
      ? data.priceBreakdown
      : (Array.isArray(data.offerRefs) && data.offerRefs.length > 0)
      ? data.offerRefs
      : (Array.isArray(data.offers) && data.offers.length > 0)
      ? data.offers
      : [];

  const offers = rawOffers.map((item) => {
    const offerObj = typeof item.offer === "object" ? item.offer : null;
    return {
      offerId: item.offerId ?? item.id ?? item._id ?? (typeof item.offer === "string" ? item.offer : offerObj?._id ?? offerObj?.id),
      title: item.title ?? offerObj?.title ?? (item.itemType === "flight" ? "Flight Component" : item.itemType === "hotel" ? "Hotel Component" : "Package Offer"),
      itemType: item.itemType ?? offerObj?.itemType ?? "offer",
      sellPrice: Number(item.retailPrice ?? item.sellPrice ?? offerObj?.sellPrice ?? 0),
      costPrice: Number(item.costPrice ?? offerObj?.costPrice ?? 0),
      destination: item.destination ?? offerObj?.destination ?? "",
      unitsPerBooking: Number(item.unitsPerBooking ?? 1),
      isOptional: Boolean(item.isOptional),
      allowSwap: Boolean(item.allowSwap),
    };
  });

  const targetId = data.id ?? data._id ?? data.packageId;

  const base = {
    ...data,
    id: targetId,
    title: data.title ?? "",
    destination: data.destination ?? "",
    description: data.description ?? "",
    durationDays: data.durationDays ?? 1,
    nights: data.nights ?? 0,
    status: data.status ?? (data.isActive === false ? "inactive" : "active"),
    availableSlots: data.availableSlots ?? 0,
    images: Array.isArray(data.images) ? data.images.filter((url) => typeof url === "string" && url) : [],
    inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
    offers,
    bundleDiscountPercentage: Number(data.bundleDiscountPercentage ?? 0),
    guideActive: data.guideActive ?? data.includeGuide ?? false,
    guideLocation: data.guideLocation ?? "",
    guidePrice: data.guidePrice ?? "",
    validityFrom: data.validity?.from?.slice(0, 10) ?? data.validityFrom ?? "",
    validityTo: data.validity?.to?.slice(0, 10) ?? data.validityTo ?? "",
    visibility: data.isPublic === false || data.visibility === "private" ? "private" : "public",
  };

  return {
    ...base,
    itinerary: (data.itinerary ?? []).map((day, index) => ({
      day: day.day ?? index + 1,
      title: day.title ?? "",
      description: day.description ?? "",
      assignedOffers: (day.assignedOffers ?? []).map((entry) => ({
        offer: typeof entry.offer === "string" ? entry.offer : entry.offer?._id ?? entry.offer?.id ?? "",
        role: entry.role ?? "activity",
        notes: entry.notes ?? "",
      })),
    })),
  };
};

const toIso = (value, endOfDay = false) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

export default function PackageWizard({ initialData, mode = "create", onSaved, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => normalize(initialData));
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const unbundledTotal = useMemo(
    () => form.offers.reduce((sum, offer) => sum + Number(offer.sellPrice || 0), 0),
    [form.offers],
  );
  const sellPrice = useMemo(
    () => Math.round(unbundledTotal * (1 - Number(form.bundleDiscountPercentage || 0) / 100)),
    [unbundledTotal, form.bundleDiscountPercentage],
  );

  const next = () => {
    if (step === 0 && (!form.title.trim() || !form.destination.trim())) {
      toast.error("Title and destination are required");
      return;
    }
    if (step === 1 && form.offers.length < 2) {
      toast.error("A package must contain at least 2 offers (e.g. Flight + Hotel)");
      return;
    }
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const previous = () => setStep((value) => Math.max(0, value - 1));

  const save = async () => {
    if (form.offers.length < 2) {
      toast.error("A package must contain at least 2 offers (e.g. Flight + Hotel)");
      return;
    }

    setSaving(true);
    try {
      // POST /api/v1/crm/packages body — images are Cloudinary URLs uploaded
      // during the Basic step; itinerary days carry assignedOffers; sellPrice
      // is sent as reference (the server recomputes it when omitted).
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        destination: form.destination.trim(),
        images: (form.images ?? []).filter((url) => typeof url === "string" && url),
        offerRefs: form.offers.map((offer) => ({
          offer: offer.offerId,
          unitsPerBooking: Number(offer.unitsPerBooking ?? 1),
          isOptional: offer.isOptional ?? false,
          allowSwap: offer.allowSwap ?? false,
        })),
        bundleDiscountPercentage: Number(form.bundleDiscountPercentage || 0),
        sellPrice,
        // Guide bundle — sent only when enabled, matching spec A exactly.
        // The API accepts both flags: includeGuide (customer can add it)
        // and guideActive (guide config is live on this package).
        ...(form.guideActive
          ? {
              includeGuide: true,
              guideActive: true,
              ...(String(form.guideLocation || "").trim()
                ? { guideLocation: String(form.guideLocation).trim() }
                : {}),
              ...(Number(form.guidePrice) > 0
                ? { guidePrice: Number(form.guidePrice) }
                : {}),
            }
          : { includeGuide: false, guideActive: false }),
        inclusions: (form.inclusions ?? []).filter((item) => typeof item === "string" && item.trim()),
        itinerary: (form.itinerary ?? []).map((day, index) => ({
          day: day.day ?? index + 1,
          title: day.title,
          description: day.description,
          assignedOffers: (day.assignedOffers ?? [])
            .filter((entry) => entry.offer)
            .map((entry) => ({
              offer: entry.offer,
              role: entry.role,
              notes: entry.notes?.trim() || "",
            })),
        })),
        ...(form.validityFrom || form.validityTo
          ? {
              validity: {
                ...(form.validityFrom ? { from: toIso(form.validityFrom) } : {}),
                ...(form.validityTo ? { to: toIso(form.validityTo, true) } : {}),
              },
            }
          : {}),
        isPublic: form.visibility !== "private",
      };

      const targetId = form.id || form._id || initialData?.id || initialData?._id;
      const result = mode === "edit"
        ? await packagesApi.update(targetId, payload)
        : await packagesApi.create(payload);

      toast.success(mode === "edit" ? "Package updated successfully" : "Package created successfully");
      if (onSaved) onSaved(result || { id: targetId, ...payload });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to save package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index <= step && setStep(index)}
              className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${index === step ? "bg-emerald-700 text-white" : index < step ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-[11px]">{index < step ? <Check size={13} /> : index + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 0 && <BasicDetails form={form} setField={setField} />}
        {step === 1 && <OfferSelection form={form} setField={setField} />}
        {step === 2 && <PricingDetails form={form} setField={setField} unbundledTotal={unbundledTotal} />}
        {step === 3 && <ItineraryBuilder form={form} setField={setField} />}
        {step === 4 && <ReviewStep form={form} unbundledTotal={unbundledTotal} sellPrice={sellPrice} />}

        <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
          <Button variant="secondary" onClick={step === 0 ? onCancel : previous}>
            <ArrowLeft size={16} />{step === 0 ? "Cancel" : "Previous"}
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={next}>Continue <ArrowRight size={16} /></Button>
          ) : (
            <Button loading={saving} onClick={save}><ClipboardCheck size={16} />{mode === "edit" ? "Update Package" : "Create Package"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ form, unbundledTotal, sellPrice }) {
  const discount = Number(form.bundleDiscountPercentage || 0);
  // Guide is priced on top of the bundle (spec B: final = sell + guidePrice).
  const guidePrice = form.guideActive ? Number(form.guidePrice || 0) : 0;
  const total = sellPrice + guidePrice;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Review Package</h2>
        <p className="mt-1 text-sm text-slate-500">Review the package before saving it.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Summary label="Title" value={form.title || "—"} />
        <Summary label="Destination" value={form.destination || "—"} />
        <Summary label="Offers bundled" value={`${form.offers.length} selected`} />
        <Summary label="Visibility" value={form.visibility === "private" ? "Private" : "Public"} />
        <Summary label="Validity" value={form.validityFrom || form.validityTo ? `${form.validityFrom || "—"} to ${form.validityTo || "—"}` : "No validity window"} />
        <Summary label="Itinerary days" value={form.itinerary.length} />
        <Summary label="Images" value={(form.images ?? []).length} />
        <Summary
          label="Ziyarat guide"
          value={
            form.guideActive
              ? `Enabled${form.guideLocation ? ` · ${form.guideLocation}` : ""}${Number(form.guidePrice) > 0 ? ` · ${formatCurrency(Number(form.guidePrice))}` : ""}`
              : "Not included"
          }
        />
      </div>

      {(form.images ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.images.map((url, index) => (
            <img key={`${url}-${index}`} src={url} alt={`Package image ${index + 1}`} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
          ))}
        </div>
      )}

      {(form.inclusions ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.inclusions.map((item) => (
            <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{item}</span>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pricing</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Price label="Unbundled total" value={unbundledTotal} />
          <Price label={`Bundle discount (${discount}%)`} value={unbundledTotal - sellPrice} />
          <Price label="Guide price" value={guidePrice} />
          <Price label="Total price" value={total} />
        </div>
        <div className="mt-4 space-y-2">
          {form.offers.map((offer) => (
            <div key={offer.offerId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-slate-700">{offer.title}</span>
                {offer.isOptional && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Optional</span>
                )}
                {offer.allowSwap && (
                  <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">Swappable</span>
                )}
              </span>
              <span className="ml-3 shrink-0 font-bold text-slate-800">{formatCurrency(offer.sellPrice)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}
function Price({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{formatCurrency(value || 0)}</p></div>;
}
