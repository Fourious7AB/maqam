import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Check, ImageOff, Mail, MapPin,
  Pencil, Phone, Star, Trash2, User,
} from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { crmApi } from "../../crm/crmApi";
import { Pill, Field, inputClass, FormActions } from "../../crm/crmUi";
import { stocksApi } from "../stocks/stocksApi";

const emptyEdit = { name: "", destination: "", address: "", isActive: true };

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const asUrls = (list) =>
  (list ?? []).filter((url) => typeof url === "string" && url.trim());

export default function HotelDetailPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryClient = useQueryClient();

  // ?edit=1 (card-corner edit) opens the form immediately.
  const [editing, setEditing] = useState(new URLSearchParams(search).get("edit") === "1");
  const [editForm, setEditForm] = useState(emptyEdit);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [stockDetailId, setStockDetailId] = useState(null);

  // ---- hotel (GET /api/v1/crm/hotels/:id) ----
  const hotelQuery = useQuery({
    queryKey: ["crm", "hotels", "detail-page", hotelId],
    queryFn: () => crmApi.getHotel(hotelId),
    enabled: !!hotelId,
  });

  useEffect(() => {
    if (hotelQuery.isError) {
      toast.error(hotelQuery.error?.response?.data?.message || "Unable to load hotel details.");
    }
  }, [hotelQuery.isError, hotelQuery.error]);

  const hotel = hotelQuery.data ?? null;

  // ---- this hotel's inventory stock (room blocks carry their own images) ----
  const stocksQuery = useQuery({
    queryKey: ["crm", "hotels", "detail-page", hotelId, "stock-join"],
    queryFn: async () => {
      const first = await stocksApi.listHotels({ page: 1, limit: 1000 });
      const all = [...first.stocks];
      const totalPages = first.pagination?.totalPages ?? 1;
      for (let page = 2; page <= Math.min(totalPages, 3); page += 1) {
        const next = await stocksApi.listHotels({ page, limit: 1000 });
        all.push(...next.stocks);
      }
      return all;
    },
    staleTime: 60_000,
  });

  const stock = useMemo(() => {
    const key = (hotel?.name ?? "").trim().toLowerCase();
    if (!key) return null;
    const contracts = (stocksQuery.data ?? [])
      .filter((item) => (item.hotelName ?? "").trim().toLowerCase() === key)
      .map((item) => ({ ...item, id: item._id ?? item.id }));

    if (!contracts.length) return null;

    const available = contracts.reduce((sum, item) => sum + Number(item.availableUnits || 0), 0);
    const total = contracts.reduce((sum, item) => sum + Number(item.totalUnits || 0), 0);
    return { contracts, available, total };
  }, [hotel?.name, stocksQuery.data]);

  // Gallery: every image the backend actually stores — the hotel document
  // first, then each inventory room block. No external/placeholder images.
  const gallery = useMemo(
    () => [...asUrls(hotel?.images), ...(stock?.contracts ?? []).flatMap((item) => asUrls(item.images))],
    [hotel?.images, stock?.contracts],
  );

  const summary = {
    available: stock?.available ?? 0,
    total: stock?.total ?? 0,
    contractCount: stock?.contracts.length ?? 0,
  };

  // Full allotment detail incl. every room unit (GET /api/v1/crm/stocks/hotels/:id).
  const stockDetailQuery = useQuery({
    queryKey: ["crm", "stocks", "hotels", stockDetailId],
    queryFn: () => stocksApi.getHotelDetails(stockDetailId),
    enabled: !!stockDetailId,
  });
  const stockDetail = stockDetailQuery.data ?? null;
  const unitStatusTone = {
    available: "bg-emerald-50 text-emerald-700",
    blocked: "bg-amber-50 text-amber-700",
    unavailable: "bg-slate-100 text-slate-500",
    assigned: "bg-blue-50 text-blue-700",
    used: "bg-blue-50 text-blue-700",
  };

  const startEdit = () => {
    setEditForm({
      name: hotel?.name ?? "",
      destination: hotel?.destination ?? "",
      address: hotel?.address ?? "",
      isActive: hotel?.isActive !== false,
    });
    setEditing(true);
  };

  // PATCH /api/v1/crm/hotels/:id — then re-render with the new data
  const updateMutation = useMutation({
    mutationFn: (payload) => crmApi.updateHotel(hotelId, payload),
    onSuccess: async () => {
      toast.success("Hotel updated");
      await hotelQuery.refetch();
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["crm", "hotels"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update hotel");
    },
  });

  // DELETE /api/v1/crm/hotels/:id — then back to the list
  const deleteMutation = useMutation({
    mutationFn: () => crmApi.deleteHotel(hotelId),
    onSuccess: () => {
      toast.success("Hotel deleted");
      queryClient.invalidateQueries({ queryKey: ["crm", "hotels"] });
      navigate("/admin/inventory/hotels", { replace: true });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to delete hotel");
    },
  });

  const handleUpdate = (event) => {
    event.preventDefault();
    if (!editForm.name.trim() || !editForm.destination.trim()) {
      toast.error("Hotel name and destination are required");
      return;
    }
    updateMutation.mutate({
      name: editForm.name.trim(),
      destination: editForm.destination.trim(),
      address: editForm.address.trim() || undefined,
      isActive: editForm.isActive,
    });
  };

  if (hotelQuery.isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><LoadingSpinner /></div>;
  }

  if (!hotel) {
    return (
      <div className="grid min-h-[50vh] place-items-center gap-4 text-center">
        <div>
          <p className="text-base font-bold text-slate-900">Hotel not found</p>
          <p className="mt-1 text-sm text-slate-400">It may have been removed.</p>
          <Link
            to="/admin/inventory/hotels"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            <ArrowLeft size={16} />
            Back to all hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 border-b border-slate-100 bg-white/95 px-1 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/inventory/hotels")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Back to all hotels"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                <span className="truncate">{hotel.name}</span>
                {Number(hotel.starRating) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: Math.min(5, Math.round(Number(hotel.starRating))) }, (_, i) => (
                      <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                )}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-400">
                <MapPin size={12} className="shrink-0 text-emerald-600" />
                {hotel.destination}
                {hotel.address ? ` · ${hotel.address}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={hotel.isActive !== false ? "green" : "slate"}>
                {hotel.isActive !== false ? "Active" : "Inactive"}
              </Pill>
              {stock && (
                <Pill tone="blue">
                  {summary.available} rooms available · total stock {summary.total} units
                </Pill>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={editing ? "secondary" : "primary"}
                onClick={() => (editing ? setEditing(false) : startEdit())}
              >
                <Pencil size={14} />
                {editing ? "Cancel Edit" : "Edit"}
              </Button>

              <Button
                variant="secondary"
                className="!border-red-200 !text-red-600 hover:!bg-red-50"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        /* ------------------------------ Edit form ------------------------------ */
        <form onSubmit={handleUpdate} className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Pencil size={15} className="text-emerald-700" />
            Edit hotel details
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hotel Name">
              <input className={inputClass} placeholder="Pullman Zamzam Makkah" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Destination">
              <input className={inputClass} placeholder="Makkah" value={editForm.destination} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address">
                <input className={inputClass} placeholder="Abraj Al Bait Complex, Makkah" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" />
              Active
            </label>
          </div>
          <div className="mt-2">
            <FormActions
              onCancel={() => setEditing(false)}
              saving={updateMutation.isPending}
              label="Save Changes"
            />
          </div>
        </form>
      ) : (
        <>
          {/* ------------------------------ Gallery ------------------------------ */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            {gallery.length ? (
              <>
                <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-50">
                  <img
                    src={gallery[activeImage] ?? gallery[0]}
                    alt={hotel.name}
                    className="h-full w-full object-cover"
                  />
                  {gallery.length > 1 && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                      {activeImage + 1} / {gallery.length}
                    </span>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setActiveImage(index)}
                        className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          index === activeImage ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        aria-label={`Show photo ${index + 1}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid h-40 place-items-center rounded-xl bg-slate-50 text-center text-sm text-slate-300">
                <div>
                  <ImageOff size={28} className="mx-auto mb-2" />
                  No photos on record yet.
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------ Info + stock ------------------------------ */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left: details */}
            <div className="space-y-5 lg:col-span-1">
              <div className="rounded-2xl border border-slate-100 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Details</h2>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <Building2 size={15} className="mt-0.5 shrink-0 text-slate-300" />
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Hotel</dt>
                      <dd className="text-slate-700">{hotel.name}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-300" />
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Destination</dt>
                      <dd className="text-slate-700">{hotel.destination || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-300" />
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Address</dt>
                      <dd className="text-slate-700">{hotel.address || "—"}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Facilities</h2>
                {hotel.amenities?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities.map((amenity) => (
                      <span key={amenity} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <Check size={12} />
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">None on record.</p>
                )}
              </div>

              {(hotel.contactPerson || hotel.contactPhone || hotel.contactEmail) && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <h2 className="mb-3 text-sm font-bold text-slate-900">Tie-up contact</h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {hotel.contactPerson && (
                      <li className="flex items-center gap-1.5"><User size={14} className="shrink-0 text-slate-300" />{hotel.contactPerson}</li>
                    )}
                    {hotel.contactPhone && (
                      <li className="flex items-center gap-1.5"><Phone size={14} className="shrink-0 text-slate-300" />{hotel.contactPhone}</li>
                    )}
                    {hotel.contactEmail && (
                      <li className="flex min-w-0 items-center gap-1.5"><Mail size={14} className="shrink-0 text-slate-300" /><span className="truncate">{hotel.contactEmail}</span></li>
                    )}
                  </ul>
                </div>
              )}

              {hotel.contractNotes && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <h2 className="mb-2 text-sm font-bold text-slate-900">Contract notes</h2>
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{hotel.contractNotes}</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-white p-5 text-xs text-slate-400">
                <p>Created {formatDateTime(hotel.createdAt)}</p>
                <p>Updated {formatDateTime(hotel.updatedAt)}</p>
                <p className="min-w-0 truncate font-mono">ID: {hotel._id}</p>
              </div>
            </div>

            {/* Right: inventory stock of this hotel */}
            <div className="space-y-5 lg:col-span-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Inventory stock</h2>
                  {stock && (
                    <p className="text-xs font-semibold text-blue-600">
                      {summary.available} rooms available
                      <span className="font-normal text-slate-400">
                        {" "}· total stock {summary.total} units · {summary.contractCount} contract{summary.contractCount === 1 ? "" : "s"}
                      </span>
                    </p>
                  )}
                </div>

                {stock ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {stock.contracts.map((contract) => (
                      <button
                        key={contract.id}
                        type="button"
                        onClick={() => setStockDetailId(contract.id)}
                        title="Click to view full allotment details"
                        className="cursor-pointer rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{contract.roomType || "—"}</p>
                          <span className={Number(contract.availableUnits) === 0 ? "shrink-0 text-xs font-bold text-red-600" : "shrink-0 text-xs font-bold text-emerald-700"}>
                            {contract.availableUnits}
                            <span className="font-normal text-slate-400"> / {contract.totalUnits}</span>
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-700">
                          {formatDate(contract.checkIn)} → {formatDate(contract.checkOut)}
                          <span className="text-slate-400">
                            {" "}· {contract.totalNights} night{contract.totalNights === 1 ? "" : "s"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          ₹{Number(contract.pricePerNight || 0).toLocaleString("en-IN")} / night
                          {(contract.meals ?? []).length > 0 && (
                            <span className="text-slate-400">
                              {" "}· {(contract.meals ?? []).map((meal) => meal.charAt(0).toUpperCase() + meal.slice(1)).join(", ")}
                            </span>
                          )}
                        </p>
                        {contract.reservationRef && (
                          <p className="mt-1 font-mono text-[11px] font-bold text-slate-400">{contract.reservationRef}</p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 py-3 text-sm text-slate-400">
                    No stock contracted for this hotel yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock allotment detail (GET /api/v1/crm/stocks/hotels/:id) */}
      <Modal open={!!stockDetailId} title="Room Allotment Details" onClose={() => setStockDetailId(null)}>
        {stockDetailQuery.isLoading ? (
          <LoadingSpinner />
        ) : stockDetail ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Room type</p>
                <p className="mt-0.5 font-bold text-slate-900">{stockDetail.roomType || "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Review status</p>
                <p className="mt-0.5 font-bold capitalize text-slate-900">{(stockDetail.reviewStatus || "—").replace("_", " ")}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Stay window</p>
                <p className="mt-0.5 font-bold text-slate-900">{formatDate(stockDetail.checkIn)} → {formatDate(stockDetail.checkOut)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rate / nights</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  ₹{Number(stockDetail.pricePerNight || 0).toLocaleString("en-IN")} / night · {stockDetail.totalNights ?? "—"} night{(stockDetail.totalNights ?? 1) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Units</p>
                <p className="mt-0.5 font-bold text-slate-900">{stockDetail.availableUnits ?? 0} available / {stockDetail.totalUnits ?? 0} total</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost per unit</p>
                <p className="mt-0.5 font-bold text-slate-900">₹{Number(stockDetail.costPerUnit || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>

            {(stockDetail.meals ?? []).length > 0 && (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Meals:</span>{" "}
                {stockDetail.meals.map((meal) => meal.charAt(0).toUpperCase() + meal.slice(1)).join(", ")}
              </p>
            )}
            {stockDetail.reservationRef && (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Reservation ref:</span>{" "}
                <span className="font-mono">{stockDetail.reservationRef}</span>
              </p>
            )}
            {stockDetail.nameAdditionDeadline && (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Name-addition deadline:</span>{" "}
                {formatDate(stockDetail.nameAdditionDeadline)}
              </p>
            )}

            {(stockDetail.units ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Room units ({stockDetail.units.length})
                </p>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {stockDetail.units.map((unit) => (
                    <span
                      key={unit._id ?? unit.id}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${unitStatusTone[unit.status] || "bg-slate-100 text-slate-500"}`}
                    >
                      {unit.status}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Could not load allotment details.</p>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleteOpen} title="Delete Hotel" onClose={() => setDeleteOpen(false)} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Permanently delete <b>{hotel.name}</b> and remove it from the storefront?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="!bg-red-700 hover:!bg-red-800"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 size={14} />
              Delete Hotel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
