import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, RotateCw, Star } from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { crmApi } from "../../crm/crmApi";
import { Pill, Field, inputClass, FormActions } from "../../crm/crmUi";
import { stocksApi } from "../stocks/stocksApi";

const PAGE_SIZE = 20;

const emptyAdd = { name: "", destination: "", address: "", starRating: "5" };

const firstCover = (hotel) =>
  (hotel?.images ?? []).find((url) => typeof url === "string" && url) || null;

export default function HotelsDirectory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ---- list (GET /api/v1/crm/hotels?page=&limit=&search=) ----
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listQuery = useQuery({
    queryKey: ["crm", "hotels", "directory", { page, search: debouncedSearch }],
    queryFn: () => crmApi.listHotels({ page, limit: PAGE_SIZE, search: debouncedSearch }),
    placeholderData: (previous) => previous,
  });

  const hotels = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;

  // ---- stock join: contract allotments keyed by hotel name so each card can
  //      show live availability and total stock units ----
  const stocksQuery = useQuery({
    queryKey: ["crm", "hotels", "directory", "stock-join"],
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

  const stockByHotel = useMemo(() => {
    const map = {};
    for (const stock of stocksQuery.data ?? []) {
      const key = (stock.hotelName ?? "").trim().toLowerCase();
      if (!key) continue;
      map[key] = map[key] ?? { available: 0, total: 0 };
      map[key].available += Number(stock.availableUnits || 0);
      map[key].total += Number(stock.totalUnits || 0);
    }
    return map;
  }, [stocksQuery.data]);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [saving, setSaving] = useState(false);

  // POST /api/v1/crm/hotels — register a new hotel property
  const handleAdd = async (event) => {
    event.preventDefault();
    if (!addForm.name.trim() || !addForm.destination.trim()) {
      toast.error("Hotel name and destination are required");
      return;
    }
    try {
      setSaving(true);
      await crmApi.createHotel({
        name: addForm.name.trim(),
        destination: addForm.destination.trim(),
        address: addForm.address.trim() || undefined,
        starRating: Number(addForm.starRating || 5),
      });
      toast.success("Hotel created");
      setAddOpen(false);
      setAddForm(emptyAdd);
      queryClient.invalidateQueries({ queryKey: ["crm", "hotels", "directory"] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create hotel");
    } finally {
      setSaving(false);
    }
  };

  // ============================ LIST VIEW ============================
  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Hotels"
        subtitle="Register and manage hotel properties across all destinations."
        actions={
          <>
            <Button variant="secondary" onClick={() => { listQuery.refetch(); stocksQuery.refetch(); }} loading={listQuery.isFetching || stocksQuery.isFetching}>
              <RotateCw size={16} />
              Refresh
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} />
              Add Hotel
            </Button>
          </>
        }
      />

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <input
          className={inputClass}
          placeholder="Search hotels by name or destination…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* Cards */}
      {listQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading hotels...</div>
      ) : listQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-sm font-semibold text-red-600">
          Failed to load hotels. Please refresh and try again.
        </div>
      ) : hotels.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hotels.map((hotel) => {
            const stock = stockByHotel[(hotel.name ?? "").trim().toLowerCase()] ?? null;
            const cover = firstCover(hotel);

            return (
              <div
                key={hotel._id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/inventory/hotels/${hotel._id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    navigate(`/admin/inventory/hotels/${hotel._id}`);
                  }
                }}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Cover */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  {cover ? (
                    <img
                      src={cover}
                      alt={hotel.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-slate-50 text-xs font-semibold text-slate-300">
                      No photo on record
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                      hotel.isActive !== false ? "bg-emerald-600/90 text-white" : "bg-slate-600/90 text-white"
                    }`}
                  >
                    {hotel.isActive !== false ? "Active" : "Inactive"}
                  </span>
                  {Number(hotel.starRating) > 0 && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      <Star size={11} fill="currentColor" strokeWidth={0} className="text-amber-400" />
                      {hotel.starRating} ★
                    </span>
                  )}

                  {/* Corner edit button */}
                  <button
                    type="button"
                    aria-label={`Edit ${hotel.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/admin/inventory/hotels/${hotel._id}?edit=1`);
                    }}
                    className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm transition hover:bg-emerald-700 hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="truncate text-sm font-bold text-slate-900">{hotel.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <MapPin size={13} className="shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {hotel.destination}
                      {hotel.address ? ` · ${hotel.address}` : ""}
                    </span>
                  </p>

                  {/* Availability + total stock */}
                  {stock ? (
                    <p className={stock.available === 0 ? "text-xs font-semibold text-red-600" : "text-xs font-semibold text-blue-600"}>
                      {stock.available} rooms available
                      <span className="font-normal text-slate-400">
                        {" "}· total stock {stock.total} units
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300">No stock contracted yet</p>
                  )}

                  {/* Facilities */}
                  {hotel.amenities?.length ? (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {hotel.amenities.slice(0, 3).map((amenity) => (
                        <Pill key={amenity} tone="blue">{amenity}</Pill>
                      ))}
                      {hotel.amenities.length > 3 && <Pill>+{hotel.amenities.length - 3}</Pill>}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          No hotels found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}.
        </div>
      )}

      {/* Pagination */}
      {meta?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => setPage(page - 1)} disabled={page <= 1}>
            Prev
          </Button>
          <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* ============ Add Hotel ============ */}
      <Modal open={addOpen} title="Add Hotel" onClose={() => setAddOpen(false)} size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hotel Name *">
              <input className={inputClass} required placeholder="Pullman Zamzam Makkah" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            </Field>
            <Field label="Destination *">
              <input className={inputClass} required placeholder="Makkah" value={addForm.destination} onChange={(e) => setAddForm({ ...addForm, destination: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address">
                <input className={inputClass} placeholder="Abraj Al Bait Complex, Makkah" value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
              </Field>
            </div>
            <Field label="Star Rating">
              <select className={inputClass} value={addForm.starRating} onChange={(e) => setAddForm({ ...addForm, starRating: e.target.value })}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} ★</option>
                ))}
              </select>
            </Field>
          </div>
          <FormActions onCancel={() => setAddOpen(false)} saving={saving} label="Create Hotel" />
        </form>
      </Modal>
    </div>
  );
}
