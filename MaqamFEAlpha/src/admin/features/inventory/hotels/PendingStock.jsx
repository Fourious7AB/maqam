import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import InventoryTable from "../../../components/inventory/InventoryTable";
import StatusBadge from "../../../components/common/StatusBadge";
import StockPagination from "../../../components/inventory/StockPagination";

import { hotelStockReviewApi } from "../stocks/stocksApi";

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

// Hotelier stock review queue: allotments submitted from the hotelier
// portal await CRM approval before entering the available pool.
export default function PendingStock() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const listQuery = useQuery({
    queryKey: ["hotel-stock", "pending", page],
    queryFn: () => hotelStockReviewApi.listPending({ page, limit: 10 }),
    placeholderData: (previous) => previous,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes: notes }) =>
      hotelStockReviewApi.review(id, { status, reviewNotes: notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hotel-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      toast.success(
        variables.status === "approved"
          ? "Allotment approved and added to available inventory"
          : "Allotment rejected",
      );
      setReviewTarget(null);
      setReviewNotes("");
    },
    onError: (error) =>
      // Validation envelope first: { errors: [{ field, message }] }.
      toast.error(
        error?.response?.data?.errors?.[0]?.message ||
          error?.response?.data?.message ||
          "Failed to review allotment",
      ),
  });

  const rows = (listQuery.data?.stocks ?? []).map((stock) => ({
    ...stock,
    id: stock._id ?? stock.id,
  }));

  const submitReview = (status) => {
    reviewMutation.mutate({
      id: reviewTarget.id,
      status,
      reviewNotes: reviewNotes.trim(),
    });
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Hotel Stock Approval"
        subtitle="Hotelier allotments awaiting review before they enter the available pool."
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
          Loading approval queue...
        </div>
      ) : (
        <InventoryTable
          rows={rows}
          empty="No pending hotel allotments right now."
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
              render: (row) => `${row.availableUnits ?? 0} / ${row.totalUnits ?? 0}`,
            },
            {
              key: "pricePerNight",
              label: "Price / night",
              render: (row) =>
                `₹${Number(row.pricePerNight || 0).toLocaleString("en-IN")}`,
            },
            {
              key: "createdAt",
              label: "Submitted",
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: "status",
              label: "Status",
              render: () => <StatusBadge status="Pending" />,
            },
          ]}
          renderActions={(row) => (
            <Button
              variant="secondary"
              onClick={() => {
                setReviewTarget(row);
                setReviewNotes("");
              }}
            >
              Review
            </Button>
          )}
        />
      )}

      <StockPagination
        pagination={listQuery.data?.pagination}
        onPageChange={setPage}
        disabled={listQuery.isFetching}
      />

      {/* Review modal */}
      <Modal
        open={Boolean(reviewTarget)}
        title="Review Allotment"
        onClose={() => setReviewTarget(null)}
      >
        {reviewTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <b>{reviewTarget.hotelName}</b>
              <p className="mt-0.5 text-xs text-slate-500">
                {reviewTarget.destination} · {reviewTarget.roomType} ·{" "}
                {reviewTarget.availableUnits ?? 0} of {reviewTarget.totalUnits ?? 0} rooms ·{" "}
                ₹{Number(reviewTarget.pricePerNight || 0).toLocaleString("en-IN")} / night
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Review Notes
              </span>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Confirmed room inventory and contract rates with hotel sales manager"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setReviewTarget(null)}
                disabled={reviewMutation.isPending}
              >
                Close
              </Button>
              <Button
                variant="danger"
                loading={reviewMutation.isPending}
                onClick={() => submitReview("rejected")}
              >
                Reject
              </Button>
              <Button loading={reviewMutation.isPending} onClick={() => submitReview("approved")}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
