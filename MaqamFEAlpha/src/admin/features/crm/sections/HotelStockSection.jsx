import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatDate } from "../../../utils/formatDate";
import formatCurrency from "../../../utils/formatCurrency";
import { crmApi } from "../crmApi";
import { PanelBar, ChipGroup, Pill, TableWrap, EmptyState, Field, inputClass } from "../crmUi";

const tabs = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved Stock" },
];

const mealLabels = (meals) => (meals?.length ? meals.join(", ") : "Room only");

export default function HotelStockSection() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reviewRow, setReviewRow] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  const load = async (page = 1) => {
    try {
      setLoading(true);
      if (tab === "approved") {
        const data = await crmApi.approvedStock();
        setRows(Array.isArray(data) ? data : []);
        setMeta({ total: Array.isArray(data) ? data.length : 0, page: 1, totalPages: 1 });
      } else {
        const result = await crmApi.pendingStock({ page, limit: 20 });
        setRows(Array.isArray(result.items) ? result.items : []);
        setMeta(result.meta);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReviewRow(null);
    load(1);
  }, [tab]);

  const decide = async (row, decision) => {
    if (decision === "rejected" && !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      setDeciding(true);
      await crmApi.reviewStock(row._id, {
        decision,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success(decision === "approved" ? "Batch approved" : "Batch rejected");
      setReviewRow(null);
      setRejectionReason("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to review batch");
    } finally {
      setDeciding(false);
    }
  };

  const openReject = (row) => {
    setReviewRow(row === reviewRow ? null : row);
    setRejectionReason("");
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page);
  };

  return (
    <div className="space-y-3">
      <PanelBar title="Hotel Stock" count={meta?.total} onRefresh={() => load(1)}>
        <ChipGroup options={tabs} value={tab} onChange={setTab} />
      </PanelBar>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => {
            const hotel = typeof row.hotelId === "object" ? row.hotelId : null;
            const hotelName = row.hotelName || hotel?.name || "—";
            return (
              <div key={row._id} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {hotelName} — {row.roomType}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.destination || hotel?.destination || "—"} · {formatDate(row.checkIn)} → {formatDate(row.checkOut)} · {row.totalNights ?? "—"} nights
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ref <span className="font-semibold">{row.reservationRef || "—"}</span> · {mealLabels(row.meals)} · {mealDeadline(row.nameAdditionDeadline)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(row.pricePerNight)}<span className="text-xs font-medium text-slate-500"> /night</span></p>
                    <p className="text-xs text-slate-500">{formatCurrency(row.costPerUnit)} /unit · {row.totalUnits ?? "—"} units</p>
                    {tab === "approved" && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">{row.availableUnits ?? "—"} available</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <UnitStrip units={row.units} />
                  <div className="flex items-center gap-2">
                    <Pill tone={row.reviewStatus === "approved" ? "green" : "amber"}>{row.reviewStatus}</Pill>
                    {tab === "pending" && (
                      <>
                        <Button
                          className="!px-3 !py-1.5 !text-xs"
                          disabled={deciding}
                          onClick={() => decide(row, "approved")}
                        >
                          Approve
                        </Button>
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openReject(row)}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>

                {reviewRow?._id === row._id && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
                    <Field label="Rejection Reason *">
                      <input
                        className={inputClass}
                        placeholder="Price per room exceeds agreed seasonal wholesale rate"
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                      />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setReviewRow(null)}>Cancel</Button>
                      <Button variant="danger" className="!px-3 !py-1.5 !text-xs" disabled={deciding} onClick={() => decide(row, "rejected")}>
                        Confirm Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {tab === "pending" && meta?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
              <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState message={tab === "approved" ? "No approved stock yet." : "No batches awaiting review."} />
      )}
    </div>
  );
}

function mealDeadline(value) {
  return value ? `Names due ${formatDate(value)}` : "No name deadline";
}

function UnitStrip({ units = [] }) {
  const counts = units.reduce(
    (acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    },
    {},
  );
  const order = ["available", "blocked", "used"];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {order.filter((status) => counts[status]).map((status) => (
        <Pill key={status} tone={status === "available" ? "green" : status === "blocked" ? "amber" : "slate"}>
          {counts[status]} {status}
        </Pill>
      ))}
    </div>
  );
}
