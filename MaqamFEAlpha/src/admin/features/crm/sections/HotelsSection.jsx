import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, Building2, Check, MapPin, Pencil, Star } from "lucide-react";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { crmApi } from "../crmApi";
import {
  PanelBar, SearchInput, Pill, EmptyState,
  Field, inputClass, FormActions,
} from "../crmUi";

// Fallback hotel cover shown when the property has no uploaded images yet.
const HOTEL_COVER_FALLBACK =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=70";

const emptyForm = { name: "", destination: "", address: "", starRating: "5" };

const emptyEdit = { name: "", destination: "", address: "", isActive: true };

const firstCover = (hotel) =>
  (hotel?.images ?? []).find((url) => typeof url === "string" && url) ||
  HOTEL_COVER_FALLBACK;

// Rooms are not part of the hotel-by-id spec; read whichever field the
// backend exposes so the UI never shows a broken value.
const availableRooms = (hotel) =>
  hotel?.availableRooms ?? hotel?.availableUnits ?? hotel?.totalRooms ?? hotel?.rooms ?? null;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export default function HotelsSection() {
  const [hotels, setHotels] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ---- detail panel ----
  const [detailHotel, setDetailHotel] = useState(null); // hotel being viewed
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false); // corner edit toggle
  const [edit, setEdit] = useState(emptyEdit);

  const load = async (page = 1, term = search) => {
    try {
      setLoading(true);
      const result = await crmApi.listHotels({ page, limit: 20, search: term });
      setHotels(Array.isArray(result.items) ? result.items : []);
      setMeta(result.meta);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load hotels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => load(1, ""), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const runSearch = (term) => {
    setSearch(term);
    window.clearTimeout(runSearch.t);
    runSearch.t = window.setTimeout(() => load(1, term), 250);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.destination.trim()) {
      toast.error("Hotel name and destination are required");
      return;
    }
    try {
      setSaving(true);
      await crmApi.createHotel({
        name: form.name.trim(),
        destination: form.destination.trim(),
        address: form.address.trim() || undefined,
        starRating: Number(form.starRating || 5),
      });
      toast.success("Hotel created");
      setFormOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to create hotel");
    } finally {
      setSaving(false);
    }
  };

  // ---- open detail panel: show list data instantly, refresh from GET /:id ----
  const openDetail = async (hotel) => {
    setDetailHotel(hotel);
    setDetailLoading(true);
    setEditing(false);
    try {
      const fresh = await crmApi.getHotel(hotel._id);
      if (fresh) setDetailHotel(fresh);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load hotel details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailHotel(null);
    setEditing(false);
  };

  const startEdit = () => {
    setEdit({
      name: detailHotel?.name || "",
      destination: detailHotel?.destination || "",
      address: detailHotel?.address || "",
      isActive: detailHotel?.isActive !== false,
    });
    setEditing(true);
  };

  // PATCH /api/v1/crm/hotels/:id — then show the new data immediately
  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const updated = await crmApi.updateHotel(detailHotel._id, {
        name: edit.name,
        destination: edit.destination,
        address: edit.address,
        isActive: edit.isActive,
      });
      toast.success("Hotel updated");
      setDetailHotel(updated || { ...detailHotel, ...edit });
      setEditing(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update hotel");
    } finally {
      setSaving(false);
    }
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page, search);
  };

  // ============================ DETAIL PANEL ============================
  if (detailHotel) {
    const gallery = (detailHotel?.images ?? []).filter(
      (url) => typeof url === "string" && url,
    );
    const rooms = availableRooms(detailHotel);

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={closeDetail}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeft size={16} />
          Back to all hotels
        </button>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Hero image */}
          <div className="relative h-64 w-full overflow-hidden bg-slate-100">
            <img
              src={firstCover(detailHotel)}
              alt={detailHotel?.name || "Hotel"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.target.src = HOTEL_COVER_FALLBACK;
              }}
            />
            {detailLoading && (
              <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                Refreshing…
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6">
            {/* Name + corner actions */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {detailHotel?.name || "—"}
                  </h2>
                  {Number(detailHotel?.starRating) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      {Array.from(
                        { length: Math.min(5, Math.round(Number(detailHotel.starRating))) },
                        (_, i) => (
                          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                        ),
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin size={14} className="shrink-0 text-emerald-600" />
                  {detailHotel?.destination || "—"}
                  {detailHotel?.address ? ` · ${detailHotel.address}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill tone={detailHotel?.isActive !== false ? "green" : "slate"}>
                    {detailHotel?.isActive !== false ? "Active" : "Inactive"}
                  </Pill>
                  {rooms !== null && <Pill tone="blue">{rooms} rooms available</Pill>}
                </div>
              </div>

              {/* Corner edit toggle */}
              <Button
                variant={editing ? "secondary" : "primary"}
                className="!px-3 !py-2 !text-xs"
                onClick={() => (editing ? setEditing(false) : startEdit())}
                disabled={saving}
              >
                <Pencil size={14} />
                {editing ? "Cancel Edit" : "Edit"}
              </Button>
            </div>

            {/* Body: edit form or read-only details */}
            {editing ? (
              <form onSubmit={handleUpdate} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hotel Name">
                    <input
                      className={inputClass}
                      placeholder="Pullman Zamzam Makkah"
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Destination">
                    <input
                      className={inputClass}
                      placeholder="Makkah"
                      value={edit.destination}
                      onChange={(e) => setEdit({ ...edit, destination: e.target.value })}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Address">
                      <input
                        className={inputClass}
                        placeholder="Abraj Al Bait Complex, Makkah"
                        value={edit.address}
                        onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={edit.isActive}
                        onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                      />
                      Active (visible on storefront)
                    </label>
                  </div>
                </div>
                <FormActions onCancel={() => setEditing(false)} saving={saving} label="Save Changes" />
              </form>
            ) : (
              <div className="mt-6 space-y-6 border-t border-slate-100 pt-6">
                {/* Photo gallery */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Photos</h3>
                  {gallery.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {gallery.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="h-32 overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                        >
                          <img
                            src={url}
                            alt={`${detailHotel?.name || "Hotel"} photo ${index + 1}`}
                            className="h-full w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
                            onError={(event) => {
                              event.currentTarget.parentElement.style.display = "none";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-slate-400">
                      <Building2 size={16} />
                      No photos uploaded yet.
                    </p>
                  )}
                </section>

                {/* Amenities */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Amenities</h3>
                  {detailHotel?.amenities?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {detailHotel.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          <Check size={12} />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No amenities listed yet.</p>
                  )}
                </section>

                {/* Meta */}
                <section className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 sm:grid-cols-3">
                  <p>
                    <span className="block font-bold uppercase tracking-wide text-slate-400">Created</span>
                    {formatDate(detailHotel?.createdAt)}
                  </p>
                  <p>
                    <span className="block font-bold uppercase tracking-wide text-slate-400">Updated</span>
                    {formatDate(detailHotel?.updatedAt)}
                  </p>
                  <p className="min-w-0">
                    <span className="block font-bold uppercase tracking-wide text-slate-400">ID</span>
                    <span className="block truncate font-mono">{detailHotel?._id || "—"}</span>
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================ CARD GRID ============================
  return (
    <div className="space-y-3">
      <PanelBar
        title="Hotels"
        count={meta?.total}
        onRefresh={() => load(1, search)}
        onAdd={() => setFormOpen(true)}
        addLabel="Add Hotel"
      >
        <SearchInput value={search} onChange={runSearch} placeholder="Search hotels…" />
      </PanelBar>

      {loading ? (
        <LoadingSpinner />
      ) : hotels.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hotels.map((hotel) => {
            const rooms = availableRooms(hotel);

            return (
              <button
                key={hotel._id}
                type="button"
                onClick={() => openDetail(hotel)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Cover image */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  <img
                    src={firstCover(hotel)}
                    alt={hotel?.name || "Hotel"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(event) => {
                      event.target.src = HOTEL_COVER_FALLBACK;
                    }}
                  />
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                      hotel?.isActive !== false
                        ? "bg-emerald-600/90 text-white"
                        : "bg-slate-600/90 text-white"
                    }`}
                  >
                    {hotel?.isActive !== false ? "Active" : "Inactive"}
                  </span>
                  {Number(hotel?.starRating) > 0 && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      <Star size={11} fill="currentColor" strokeWidth={0} className="text-amber-400" />
                      {hotel.starRating} ★
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {hotel?.name || "—"}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <MapPin size={13} className="shrink-0 text-emerald-600" />
                    {hotel?.destination || "—"}
                  </p>
                  {rooms !== null && (
                    <p className="text-xs font-semibold text-blue-600">{rooms} rooms available</p>
                  )}
                  {hotel?.amenities?.length ? (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {hotel.amenities.slice(0, 3).map((amenity) => (
                        <Pill key={amenity} tone="blue">{amenity}</Pill>
                      ))}
                      {hotel.amenities.length > 3 && <Pill>+{hotel.amenities.length - 3}</Pill>}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState message="No hotels found." />
      )}

      {meta?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
          <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
        </div>
      )}

      {/* Create form */}
      {formOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Add Hotel</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hotel Name *">
                <input className={inputClass} required placeholder="Pullman Zamzam Makkah" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Destination *">
                <input className={inputClass} required placeholder="Makkah" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address">
                  <input className={inputClass} placeholder="Abraj Al Bait Complex, Makkah" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
              </div>
              <Field label="Star Rating">
                <select className={inputClass} value={form.starRating} onChange={(e) => setForm({ ...form, starRating: e.target.value })}>
                  {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}
                </select>
              </Field>
            </div>
            <FormActions onCancel={() => setFormOpen(false)} saving={saving} label="Create Hotel" />
          </form>
        </div>
      )}
    </div>
  );
}
