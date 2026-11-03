import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import InventoryTable from "../../../components/inventory/InventoryTable";
import StockPagination from "../../../components/inventory/StockPagination";

import { hotelStockReviewApi } from "../stocks/stocksApi";
import { settingsApi } from "../../settings/settingsApi";

// Approved hotelier allotments — live inventory accepted by CRM review.
export default function ApprovedStock() {
  const [page, setPage] = useState(1);

  const markupQuery = useQuery({
    queryKey: ["settings", "markup"],
    queryFn: () => settingsApi.getMarkup(),
    staleTime: 60000,
  });
  const markupSettings = markupQuery.data;

  const listQuery = useQuery({
    queryKey: ["hotel-stock", "approved", page],
    queryFn: () => hotelStockReviewApi.listApproved({ page, limit: 10 }),
    placeholderData: (previous) => previous,
  });

  const rows = (listQuery.data?.stocks ?? []).map((stock) => ({
    ...stock,
    id: stock._id ?? stock.id,
  }));

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Approved Hotel Stock"
        subtitle="Hotelier allotments approved by CRM and live in the available pool."
        actions={
          <Button
            variant="secondary"
            onClick={() => listQuery.refetch()}
            loading={listQuery.isFetching}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      {listQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Loading approved stock...
        </div>
      ) : (
        <InventoryTable
          rows={rows}
          empty="No approved hotel allotments yet."
          columns={[
            {
              key: "hotel",
              label: "Hotel",
              render: (row) => (
                <div>
                  <b>{row.hotelName}</b>
                  <p className="text-xs text-slate-400">
                    {row.destination} · {row.roomType}
                  </p>
                </div>
              ),
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
                  <span className="font-bold text-emerald-700">{row.availableUnits ?? 0}</span>
                  <span className="text-slate-400"> / {row.totalUnits ?? 0}</span>
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
              key: "meals",
              label: "Meals",
              render: (row) =>
                (row.meals || [])
                  .map((meal) => meal.charAt(0).toUpperCase() + meal.slice(1))
                  .join(", ") || "—",
            },
          ]}
        />
      )}

      <StockPagination
        pagination={listQuery.data?.pagination}
        onPageChange={setPage}
        disabled={listQuery.isFetching}
      />
    </div>
  );
}
