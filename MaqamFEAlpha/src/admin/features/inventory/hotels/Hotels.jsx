import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Hotel as HotelIcon, Plus, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import InventoryTable from "../../../components/inventory/InventoryTable";
import StockOverviewMetrics from "../../../components/inventory/StockOverviewMetrics";
import StockPagination from "../../../components/inventory/StockPagination";

import { hotelPropertiesApi, stocksApi } from "../stocks/stocksApi";
import { settingsApi } from "../../settings/settingsApi";
import ImagePicker from "./ImagePicker";

const PAGE_SIZE = 10;

const MEAL_OPTIONS = ["breakfast", "lunch", "dinner"];

const emptyRoom = {
  roomType: "",
  pricePerNight: "",
  totalUnits: "",
  meals: ["breakfast"],
  reservationRef: "",
  facilities: [],
  images: [],
};

const emptyForm = {
  hotelName: "",
  destination: "",
  mainImage: "",
  amenities: [],
  checkIn: "",
  checkOut: "",
  nameAdditionDeadline: "",
  rooms: [{ ...emptyRoom }],
};

const toIso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut) - new Date(checkIn);
  if (Number.isNaN(diff) || diff <= 0) return null;
  return Math.round(diff / 86_400_000);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// Free-text chip input (facilities / amenities).
function ChipsInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value && !values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      {values.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="text-emerald-600 hover:text-emerald-900"
                aria-label={`Remove ${value}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={values.length ? "Add another..." : placeholder}
        className="w-full border-0 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function MealToggles({ value, onChange }) {
  const toggle = (meal) =>
    onChange(
      value.includes(meal) ? value.filter((item) => item !== meal) : [...value, meal],
    );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {MEAL_OPTIONS.map((meal) => (
        <label key={meal} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={value.includes(meal)}
            onChange={() => toggle(meal)}
            className="h-3.5 w-3.5 accent-emerald-700"
          />
          {meal.charAt(0).toUpperCase() + meal.slice(1)}
        </label>
      ))}
    </div>
  );
}

export default function Hotels() {
  const queryClient = useQueryClient();

  const [destination, setDestination] = useState("");
  const [debouncedDestination, setDebouncedDestination] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // Debounce the destination filter so typing does not spam the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDestination(destination);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [destination]);

  // Debounce the hotel name for the suggestion lookup.
  const [debouncedName, setDebouncedName] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(form.hotelName), 350);
    return () => clearTimeout(timer);
  }, [form.hotelName]);

  const listQuery = useQuery({
    queryKey: ["stocks", "hotels", { page, destination: debouncedDestination }],
    queryFn: () =>
      stocksApi.listHotels({ page, limit: PAGE_SIZE, destination: debouncedDestination }),
    placeholderData: (previous) => previous,
  });

  const markupQuery = useQuery({
    queryKey: ["settings", "markup"],
    queryFn: () => settingsApi.getMarkup(),
    staleTime: 60000,
  });
  const markupSettings = markupQuery.data;

  // Hotel suggestions: once two characters are typed, look for hotels already
  // registered in the CRM so the admin can link stock to the existing property.
  const suggestQuery = useQuery({
    queryKey: ["hotels", "suggest", debouncedName],
    queryFn: () => hotelPropertiesApi.list({ page: 1, limit: 10 }),
    enabled: modal && debouncedName.trim().length >= 2,
  });

  const suggestions = useMemo(() => {
    const term = debouncedName.trim().toLowerCase();
    if (term.length < 2) return [];
    return (suggestQuery.data?.hotels ?? [])
      .filter((hotel) => (hotel.name ?? hotel.hotelName ?? "").toLowerCase().includes(term))
      .filter((hotel) => {
        const id = hotel._id ?? hotel.id;
        const name = hotel.name ?? hotel.hotelName ?? "";
        return !(selectedHotel && (selectedHotel._id ?? selectedHotel.id) === id) && name.toLowerCase() !== form.hotelName.trim().toLowerCase();
      })
      .slice(0, 6);
  }, [suggestQuery.data, debouncedName, selectedHotel, form.hotelName]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1) Link or register the hotel property. Selecting a suggestion uses
      //    the existing property; a new name registers one with the main
      //    image and amenities. If the backend reports it already exists the
      //    stock rows still link by name.
      let hotelId = selectedHotel ? (selectedHotel._id ?? selectedHotel.id) : null;

      if (!hotelId) {
        try {
          const created = await hotelPropertiesApi.create({
            name: form.hotelName.trim(),
            destination: form.destination.trim(),
            images: form.mainImage ? [form.mainImage] : [],
            amenities: form.amenities,
          });
          hotelId = created?._id ?? created?.id ?? null;
        } catch (error) {
          const status = error?.response?.status;
          if (status !== 409 && status !== 400) throw error;
        }
      }

      // 2) One room block per room type, each carrying its own images,
      //    facilities, meals, pricing and allotment.
      const results = [];
      for (const room of form.rooms) {
        if (!room.roomType.trim()) continue;
        const created = await stocksApi.createHotel({
          ...(hotelId ? { hotelId } : {}),
          hotelName: form.hotelName.trim(),
          destination: form.destination.trim(),
          roomType: room.roomType.trim(),
          checkIn: toIso(form.checkIn),
          checkOut: toIso(form.checkOut),
          pricePerNight: Number(room.pricePerNight || 0),
          meals: room.meals,
          reservationRef: room.reservationRef,
          nameAdditionDeadline: toIso(form.nameAdditionDeadline),
          totalUnits: Number(room.totalUnits || 0),
          images: room.images,
          facilities: room.facilities,
        });
        results.push(created);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      toast.success("Hotel stock created with all room types");
      setModal(false);
      setForm(emptyForm);
      setSelectedHotel(null);
    },
    onError: (error) => {
      // Prefer the doc's 400 validation envelope ({ errors: [{ field, message }] })
      // so admins see e.g. "checkOut must be after checkIn" instead of a generic failure.
      toast.error(
        error?.response?.data?.errors?.[0]?.message ||
          error?.response?.data?.message ||
          "Failed to create hotel stock",
      );
    },
  });

  const rows = (listQuery.data?.stocks ?? []).map((stock) => ({
    ...stock,
    id: stock._id ?? stock.id,
  }));
  const pagination = listQuery.data?.pagination;

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const updateRoom = (index, key, value) => {
    setForm((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, position) =>
        position === index ? { ...room, [key]: value } : room,
      ),
    }));
  };

  const addRoom = () => setForm((previous) => ({ ...previous, rooms: [...previous.rooms, { ...emptyRoom }] }));

  const removeRoom = (index) =>
    setForm((previous) => ({
      ...previous,
      rooms: previous.rooms.length > 1 ? previous.rooms.filter((_, position) => position !== index) : previous.rooms,
    }));

  const selectHotel = (hotel) => {
    setSelectedHotel(hotel);
    setSuggestOpen(false);
    setForm((previous) => ({
      ...previous,
      hotelName: hotel.name ?? hotel.hotelName ?? previous.hotelName,
      destination: previous.destination || hotel.destination || "",
      mainImage: previous.mainImage || (hotel.images ?? [])[0] || "",
      amenities: previous.amenities.length ? previous.amenities : (hotel.amenities ?? []),
    }));
  };

  const changeHotelName = (value) => {
    setSelectedHotel(null);
    setSuggestOpen(true);
    setForm((previous) => ({ ...previous, hotelName: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.hotelName.trim()) {
      toast.error("Hotel name is required");
      return;
    }
    if (!form.destination.trim()) {
      toast.error("Destination is required");
      return;
    }
    if (!form.checkIn || !form.checkOut) {
      toast.error("Stay period is required");
      return;
    }
    if (!form.rooms.some((room) => room.roomType.trim() && Number(room.totalUnits) > 0)) {
      toast.error("Add at least one room type with total rooms");
      return;
    }

    createMutation.mutate();
  };

  const nights = nightsBetween(form.checkIn, form.checkOut);
  const allotmentValue =
    nights && form.rooms.reduce(
      (sum, room) => sum + Number(room.totalUnits || 0) * nights * Number(room.pricePerNight || 0),
      0,
    );

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Hotel Stock"
        subtitle="Manage contracted hotel room allotments with live availability."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => listQuery.refetch()}
              loading={listQuery.isFetching}
            >
              <RotateCw size={16} />
              Refresh
            </Button>

            <Button onClick={() => setModal(true)}>
              <Plus size={16} />
              Add Hotel Stock
            </Button>
          </>
        }
      />

      {/* Live overview metrics (polled every 15s) */}
      <StockOverviewMetrics side="hotels" />

      {/* Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <Input
          label="Destination"
          placeholder="e.g. Goa, Dubai..."
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        />
      </div>

      {/* Stock contracts table */}
      {listQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Loading hotel stock...
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-sm font-semibold text-red-600">
          Failed to load hotel stock. Please try again.
        </div>
      ) : (
        <InventoryTable
          rows={rows}
          empty="No hotel stock found for this destination."
          columns={[
            {
              key: "hotel",
              label: "Hotel",
              render: (row) => {
                // Hotel cover: populated hotelId.images first, then any room
                // image stored on the stock itself. hotelId can be null for
                // stock created without a linked property.
                const thumb =
                  (row.hotelId?.images ?? []).find((url) => typeof url === "string" && url) ??
                  (row.images ?? []).find((url) => typeof url === "string" && url) ??
                  "";
                return (
                  <div className="flex items-center gap-2.5">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                        <HotelIcon size={14} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <b className="block truncate">{row.hotelName}</b>
                      <p className="truncate text-xs text-slate-400">
                        {row.destination} · {row.roomType}
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "stay",
              label: "Stay period",
              render: (row) => (
                <div>
                  <span>
                    {formatDateTime(row.checkIn)} → {formatDateTime(row.checkOut)}
                  </span>
                  <p className="text-xs text-slate-400">
                    {row.totalNights} night{row.totalNights === 1 ? "" : "s"}
                  </p>
                </div>
              ),
            },
            {
              key: "meals",
              label: "Meals",
              render: (row) =>
                (row.meals || [])
                  .map((meal) => meal.charAt(0).toUpperCase() + meal.slice(1))
                  .join(", ") || "—",
            },
            {
              key: "reservationRef",
              label: "Reservation",
              render: (row) => (
                <span className="font-mono text-xs font-bold">
                  {row.reservationRef || "—"}
                </span>
              ),
            },
            {
              key: "rooms",
              label: "Rooms",
              render: (row) => (
                <span>
                  <span
                    className={
                      Number(row.availableUnits) === 0
                        ? "font-bold text-red-600"
                        : "font-bold text-emerald-700"
                    }
                  >
                    {row.availableUnits}
                  </span>
                  <span className="text-slate-400">
                    {" / "}
                    {row.totalUnits}
                  </span>
                </span>
              ),
            },
            {
              key: "pricePerNight",
              label: "Wholesale & Retail / night",
              render: (row) => {
                const cost = Number(row.pricePerNight || 0);
                const markupPct = Number(
                  markupSettings?.hotelMarkupPercent ?? markupSettings?.markPercent ?? 15.0
                );
                const markupAmount = Math.round((cost * markupPct) / 100);
                const retail = cost + markupAmount;
                return (
                  <div>
                    <span className="font-bold text-slate-800">
                      ₹{retail.toLocaleString("en-IN")}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Cost: ₹{cost.toLocaleString("en-IN")} ·{" "}
                      <span className="font-semibold text-emerald-700">
                        +{markupPct}% (+₹{markupAmount.toLocaleString("en-IN")})
                      </span>
                    </p>
                  </div>
                );
              },
            },
            {
              key: "costPerUnit",
              label: "Total Unit Cost",
              render: (row) => formatMoney(row.costPerUnit || (row.pricePerNight * (row.totalNights || 1))),
            },
          ]}
        />
      )}

      {/* Pagination */}
      <StockPagination
        pagination={pagination}
        onPageChange={setPage}
        disabled={listQuery.isFetching}
      />

      {/* Add Hotel Stock Modal */}
      <Modal
        open={modal}
        title="Add Hotel Stock"
        onClose={() => setModal(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ------------------ Hotel details ------------------ */}
          <section className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <HotelIcon size={15} /> Hotel details
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Hotel name with suggestions from existing hotels */}
              <div className="relative">
                <Input
                  label="Hotel Name"
                  required
                  placeholder="Grand Hyatt Dubai"
                  value={form.hotelName}
                  onChange={(event) => changeHotelName(event.target.value)}
                  onFocus={() => setSuggestOpen(true)}
                  autoComplete="off"
                />

                {selectedHotel && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    Linking to existing hotel in database
                  </p>
                )}

                {suggestOpen && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Already in database
                    </p>
                    {suggestions.map((hotel) => {
                      const id = hotel._id ?? hotel.id;
                      const image = (hotel.images ?? [])[0];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => selectHotel(hotel)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-emerald-50"
                        >
                          {image ? (
                            <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                              <HotelIcon size={13} />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-700">
                              {hotel.name ?? hotel.hotelName}
                            </span>
                            <span className="block truncate text-[11px] text-slate-400">
                              {hotel.destination}
                              {hotel.address ? ` · ${hotel.address}` : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Input
                label="Destination"
                required
                placeholder="Dubai"
                value={form.destination}
                onChange={(event) => updateField("destination", event.target.value)}
              />
            </div>

            {/* Main hotel image + hotel facilities */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ImagePicker
                label="Main hotel image"
                hint="Shown as the hotel cover across the CRM."
                images={form.mainImage ? [form.mainImage] : []}
                onChange={(images) => updateField("mainImage", images[0] ?? "")}
              />

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Hotel facilities
                </span>
                <ChipsInput
                  values={form.amenities}
                  onChange={(values) => updateField("amenities", values)}
                  placeholder="Pool, Wi-Fi, Gym... (Enter to add)"
                />
              </div>
            </div>
          </section>

          {/* ------------------ Stay period (shared by all rooms) ------------------ */}
          <section className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-bold text-slate-800">Stay period</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Check In"
                type="datetime-local"
                required
                value={form.checkIn}
                onChange={(event) => updateField("checkIn", event.target.value)}
              />
              <Input
                label="Check Out"
                type="datetime-local"
                required
                value={form.checkOut}
                onChange={(event) => updateField("checkOut", event.target.value)}
              />
              <Input
                label="Name Addition Deadline"
                type="datetime-local"
                value={form.nameAdditionDeadline}
                onChange={(event) => updateField("nameAdditionDeadline", event.target.value)}
              />
            </div>
            {nights !== null && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {nights} night{nights === 1 ? "" : "s"} stay
              </p>
            )}
          </section>

          {/* ------------------ Room types ------------------ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">
                Room types
                <span className="ml-2 font-normal text-slate-400">
                  each type keeps its own images, facilities and pricing
                </span>
              </p>
              <Button type="button" variant="secondary" onClick={addRoom}>
                <Plus size={14} />
                Add room type
              </Button>
            </div>

            {form.rooms.map((room, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <ChevronDown size={13} />
                    Room type {index + 1}
                  </p>
                  {form.rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(index)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Input
                    label="Room Type"
                    required
                    placeholder="Deluxe King Room"
                    value={room.roomType}
                    onChange={(event) => updateRoom(index, "roomType", event.target.value)}
                  />
                  <Input
                    label="Reservation Ref"
                    placeholder="HYATT-BLK-8821"
                    value={room.reservationRef}
                    onChange={(event) => updateRoom(index, "reservationRef", event.target.value)}
                  />
                  <Input
                    label="Price / Night (₹)"
                    type="number"
                    min={0}
                    required
                    value={room.pricePerNight}
                    onChange={(event) => updateRoom(index, "pricePerNight", event.target.value)}
                  />
                  <Input
                    label="Total Rooms"
                    type="number"
                    min={1}
                    required
                    value={room.totalUnits}
                    onChange={(event) => updateRoom(index, "totalUnits", event.target.value)}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">Meals</span>
                    <MealToggles value={room.meals} onChange={(meals) => updateRoom(index, "meals", meals)} />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Room facilities
                    </span>
                    <ChipsInput
                      values={room.facilities}
                      onChange={(facilities) => updateRoom(index, "facilities", facilities)}
                      placeholder="Sea view, Bathtub, Balcony... (Enter to add)"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <ImagePicker
                    multiple
                    max={4}
                    label="Room images"
                    hint="Variety shots for this room type. First image is the cover."
                    images={room.images}
                    onChange={(images) => updateRoom(index, "images", images)}
                  />
                </div>
              </div>
            ))}
          </section>

          {allotmentValue > 0 && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Total allotment value across all room types: <b>{formatMoney(allotmentValue)}</b>
              {" "}(rooms × nights × price)
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModal(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>

            <Button type="submit" loading={createMutation.isPending}>
              Create Hotel Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
