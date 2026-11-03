import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw, Plane } from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import InventoryTable from "../../../components/inventory/InventoryTable";
import StockOverviewMetrics from "../../../components/inventory/StockOverviewMetrics";
import StockPagination from "../../../components/inventory/StockPagination";
import StockModal from "../../../components/inventory/StockModal";

import { stocksApi } from "../stocks/stocksApi";
import { settingsApi } from "../../settings/settingsApi";
import BoardingPassModal from "../../../../components/flight/BoardingPassModal";

const PAGE_SIZE = 10;

const emptyFilters = {
  airline: "",
  origin: "",
  destination: "",
  pnr: "",
};

const toIso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TicketStock() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState(emptyFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  // Seat-allocation modal — GET /api/v1/crm/stocks/flights/:id (defined in the
  // API matrix; fetches the full batch with individual seat units).
  const [detailId, setDetailId] = useState(null);
  const [previewBoardingPass, setPreviewBoardingPass] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["stocks", "flights", "detail", detailId],
    queryFn: () => stocksApi.getFlightDetails(detailId),
    enabled: Boolean(detailId),
  });
  const detail = detailQuery.data ?? null;

  const markupQuery = useQuery({
    queryKey: ["settings", "markup"],
    queryFn: () => settingsApi.getMarkup(),
    staleTime: 60000,
  });
  const markupSettings = markupQuery.data;

  // Debounce the filter inputs so typing does not spam the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters]);

  const listQuery = useQuery({
    queryKey: ["stocks", "flights", { page, ...debouncedFilters }],
    queryFn: () => stocksApi.listFlights({ page, limit: PAGE_SIZE, ...debouncedFilters }),
    placeholderData: (previous) => previous,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => stocksApi.createFlight(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      toast.success("Flight ticket stock created successfully");
      setModal(false);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to create flight ticket stock",
      );
    },
  });

  const rows = (listQuery.data?.stocks ?? []).map((stock) => ({
    ...stock,
    id: stock._id ?? stock.id,
  }));
  const pagination = listQuery.data?.pagination;

  const updateFilter = (key) => (event) => {
    setFilters((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  const handleSubmit = (form) => {
    createMutation.mutate({
      airline: form.airline,
      flightNumber: form.flightNumber,
      origin: String(form.origin || "").toUpperCase(),
      destination: String(form.destination || "").toUpperCase(),
      departureDate: toIso(form.departureDate),
      arrivalDate: toIso(form.arrivalDate),
      cabinClass: form.cabinClass || "Economy",
      pnr: form.pnr,
      nameAdditionDeadline: toIso(form.nameAdditionDeadline),
      costPerUnit: Number(form.costPerUnit || 0),
      totalUnits: Number(form.totalUnits || 0),
    });
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Flight / Ticket Stock"
        subtitle="Manage PNR block seat inventory with live availability."
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
              Add Flight Stock
            </Button>
          </>
        }
      />

      {/* Live overview metrics (polled every 15s, also in background) */}
      <StockOverviewMetrics side="flights" />

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Airline"
          placeholder="e.g. IndiGo"
          value={filters.airline}
          onChange={updateFilter("airline")}
        />

        <Input
          label="Origin"
          placeholder="e.g. DEL"
          value={filters.origin}
          onChange={updateFilter("origin")}
        />

        <Input
          label="Destination"
          placeholder="e.g. DXB"
          value={filters.destination}
          onChange={updateFilter("destination")}
        />

        <Input
          label="PNR"
          placeholder="e.g. IND99812A"
          value={filters.pnr}
          onChange={updateFilter("pnr")}
        />
      </div>

      {/* Table */}
      {listQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Loading flight stock...
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-sm font-semibold text-red-600">
          Failed to load flight stock. Please try again.
        </div>
      ) : (
        <InventoryTable
          rows={rows}
          empty="No flight stock found for these filters."
          columns={[
            {
              key: "route",
              label: "Route",
              render: (row) => (
                <div>
                  <b>
                    {row.origin} → {row.destination}
                  </b>
                  <p className="text-xs text-slate-400">
                    {row.airline} · {row.flightNumber} · {row.cabinClass}
                  </p>
                </div>
              ),
            },
            {
              key: "pnr",
              label: "PNR",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setDetailId(row.id)}
                  title="Click to view individual seat allocations"
                  className="cursor-pointer rounded-lg px-2 py-1 font-mono font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  {row.pnr}
                </button>
              ),
            },
            {
              key: "departureDate",
              label: "Departure",
              render: (row) => formatDateTime(row.departureDate),
            },
            {
              key: "nameAdditionDeadline",
              label: "Name deadline",
              render: (row) => formatDate(row.nameAdditionDeadline),
            },
            {
              key: "seats",
              label: "Seats",
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
              key: "costPerUnit",
              label: "Wholesale & Retail / seat",
              render: (row) => {
                const cost = Number(row.costPerUnit || 0);
                const markupPct = Number(
                  markupSettings?.flightMarkupPercent ?? markupSettings?.markPercent ?? 12.5
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
          ]}
        />
      )}

      {/* Pagination */}
      <StockPagination
        pagination={pagination}
        onPageChange={setPage}
        disabled={listQuery.isFetching}
      />

      {/* Add Flight Stock Modal */}
      <StockModal
        key={modal ? "flight-open" : "flight-closed"}
        open={modal}
        title="Add Flight Stock"
        initial={{}}
        onClose={() => setModal(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending}
        fields={[
          { key: "airline", label: "Airline", placeholder: "IndiGo", required: true },
          { key: "flightNumber", label: "Flight Number", placeholder: "6E-1452", required: true },
          { key: "origin", label: "Origin", placeholder: "DEL", required: true },
          { key: "destination", label: "Destination", placeholder: "DXB", required: true },
          { key: "departureDate", label: "Departure", type: "datetime-local", required: true },
          { key: "arrivalDate", label: "Arrival", type: "datetime-local" },
          { key: "cabinClass", label: "Cabin Class", placeholder: "Economy" },
          { key: "pnr", label: "PNR", placeholder: "IND99812A", required: true },
          {
            key: "nameAdditionDeadline",
            label: "Name Addition Deadline",
            type: "datetime-local",
          },
          { key: "costPerUnit", label: "Cost / Seat (₹)", type: "number", min: 0, required: true },
          { key: "totalUnits", label: "Total Seats", type: "number", min: 1, required: true },
        ]}
      />

      {/* Seat-allocation dossier (GET /api/v1/crm/stocks/flights/:id) */}
      <Modal open={Boolean(detailId)} title="Flight Stock — Seat Allocations" onClose={() => setDetailId(null)}>
        {detailQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading seat allocations…</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Flight</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {detail.airline} {detail.flightNumber} · {detail.cabinClass}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">PNR</p>
                <p className="mt-0.5 font-mono font-bold text-slate-900">{detail.pnr || "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Stay window</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {formatDateTime(detail.departureDate)} → {detail.arrivalDate ? formatDateTime(detail.arrivalDate) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name deadline</p>
                <p className="mt-0.5 font-bold text-slate-900">{formatDate(detail.nameAdditionDeadline)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Units</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {detail.availableUnits ?? 0} available / {detail.totalUnits ?? 0} total
                  {(detail.heldUnits ?? 0) > 0 && <span className="text-amber-600"> · {detail.heldUnits} held</span>}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost / seat</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  ₹{Number(detail.costPerUnit || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {detail.notes && (
              <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Notes:</span> {detail.notes}</p>
            )}

            {(detail.units ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Seat units ({detail.units.length})
                </p>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {detail.units.map((unit, index) => {
                    const tone =
                      unit.status === "available"
                        ? "bg-emerald-50 text-emerald-700"
                        : unit.status === "held"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700";
                    return (
                      <span
                        key={unit._id ?? unit.unitIndex ?? index}
                        title={unit.bookingRef ? `Booking: ${unit.bookingRef}${unit.heldUntil ? ` · held until ${formatDateTime(unit.heldUntil)}` : ""}` : undefined}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
                      >
                        #{unit.unitIndex ?? index + 1} · {unit.status}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Passenger Boarding Pass:</span>
              <button
                type="button"
                onClick={() => setPreviewBoardingPass(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#011B94] hover:bg-blue-900 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                <Plane size={13} />
                <span>Preview Boarding Pass</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Could not load seat allocations.</p>
        )}
      </Modal>

      {/* Boarding Pass Preview Modal */}
      <BoardingPassModal
        isOpen={previewBoardingPass}
        onClose={() => setPreviewBoardingPass(false)}
        booking={detail}
        flight={{
          airline: detail?.airline,
          flightNumber: detail?.flightNumber,
          origin: detail?.origin,
          destination: detail?.destination,
          departure: detail?.departureDate,
          arrival: detail?.arrivalDate,
        }}
        pnr={detail?.pnr || "B4K68K"}
        passengers={[
          {
            firstName: "Rajarajeshwari",
            lastName: "Satyanarayana",
            seat: "3F",
            seatNumber: "3F",
          },
        ]}
      />
    </div>
  );
}
