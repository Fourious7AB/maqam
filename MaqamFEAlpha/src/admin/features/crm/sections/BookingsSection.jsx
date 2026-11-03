import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { List, LayoutGrid, UserRound } from "lucide-react";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatDate } from "../../../utils/formatDate";
import formatCurrency from "../../../utils/formatCurrency";
import { crmApi } from "../crmApi";
import { useCrmUserMap, extractUserId } from "../crmUserResolver";
import {
  PanelBar, ChipGroup, Pill, TableWrap, EmptyState,
  Field, inputClass, FormActions,
} from "../crmUi";

const statusOptions = [
  { value: "", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const tone = {
  confirmed: "green",
  cancelled: "red",
};

const emptyEdit = {
  startDate: "", endDate: "",
  email: "", phone: "", emergencyContact: "",
  remark: "",
};

export default function BookingsSection() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const userMap = useCrmUserMap(rows, (r) => r.userId || r.customer || r.customerId || r.user);

  const [staff, setStaff] = useState([]);
  const [assignRow, setAssignRow] = useState(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [working, setWorking] = useState(false);

  const [editRow, setEditRow] = useState(null);
  const [edit, setEdit] = useState(emptyEdit);
  const [working2, setWorking2] = useState(false);

  const load = async (page = 1) => {
    try {
      setLoading(true);
      const result = await crmApi.listBookings({ status, page, limit: 20 });
      setRows(Array.isArray(result.items) ? result.items : []);
      setMeta(result.meta);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const ensureStaff = async () => {
    if (staff.length) return staff;
    try {
      const result = await crmApi.listStaff({ isActive: "true", limit: 100 });
      const agents = (result.items || []).filter(
        (person) => person.role && person.role !== "customer",
      );
      setStaff(agents);
      return agents;
    } catch {
      toast.error("Could not load agent list");
      return [];
    }
  };

  const openAssign = async (row) => {
    if (assignRow?._id === row._id) {
      setAssignRow(null);
      return;
    }
    setAssignRow(row);
    setAssignedTo(row.assignedTo?._id || row.assignedTo || "");
    await ensureStaff();
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!assignedTo) {
      toast.error("Select an agent to assign");
      return;
    }
    try {
      setWorking(true);
      await crmApi.assignBooking(assignRow._id, assignedTo);
      toast.success("Booking assigned");
      setAssignRow(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to assign booking");
    } finally {
      setWorking(false);
    }
  };

  const openEdit = (row) => {
    if (editRow?._id === row._id) {
      setEditRow(null);
      return;
    }
    setEditRow(row);
    setEdit({
      startDate: row.travelDates?.startDate?.slice(0, 10) || "",
      endDate: row.travelDates?.endDate?.slice(0, 10) || "",
      email: row.contactDetails?.email || "",
      phone: row.contactDetails?.phone || "",
      emergencyContact: row.contactDetails?.emergencyContact || "",
      remark: row.remark || "",
    });
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    try {
      setWorking2(true);
      await crmApi.updateBooking(editRow._id, {
        ...(edit.startDate && edit.endDate
          ? { travelDates: { startDate: edit.startDate, endDate: edit.endDate } }
          : {}),
        contactDetails: {
          email: edit.email,
          phone: edit.phone,
          emergencyContact: edit.emergencyContact,
        },
        remark: edit.remark,
      });
      toast.success("Booking updated");
      setEditRow(null);
      load();
    } catch (e) {
      const reason = e?.response?.data?.message;
      toast.error(
        reason && /structural/i.test(reason)
          ? "Backend rejected the change: structural edits are not allowed on confirmed bookings."
          : reason || "Failed to update booking",
      );
    } finally {
      setWorking2(false);
    }
  };

  const handleCancel = async (row) => {
    const reason = window.prompt(
      "Cancellation reason (stock units are released back to wholesale stock):",
    );
    if (reason === null) return;
    try {
      await crmApi.cancelBooking(row._id, reason || "No reason provided");
      toast.success("Booking cancelled");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to cancel booking");
    }
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page);
  };

  const packageTitle = (row) =>
    row.packageId?.title || row.packageSnapshot?.title || row.details?.destination || row.destination || row.title || "—";

  const customerLabel = (row) => {
    const user = row.userId;
    if (typeof user === "object" && user && (user.firstName || user.name)) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.phone || user.email || "Customer";
    }
    const id = extractUserId(user || row.customer || row.customerId);
    const resolvedName = userMap.getName(id, "");
    if (resolvedName && resolvedName !== "Customer") {
      return resolvedName;
    }
    if (row.customerName && row.customerName !== "Customer") {
      return row.customerName;
    }
    const lead = row.travellers?.[0];
    if (lead?.firstName || lead?.name) {
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.name;
    }
    return resolvedName || "Customer";
  };

  const customerSub = (row) => {
    const user = row.userId;
    const id = extractUserId(user || row.customer || row.customerId);
    const u = userMap.getUser(id);
    if (u?.email || u?.phone) return u.email || u.phone;
    if (typeof user === "object" && user && (user.email || user.phone)) {
      return user.email || user.phone;
    }
    return row.contactDetails?.email || row.contactDetails?.phone || "";
  };

  return (
    <div className="space-y-3">
      <PanelBar title="Package Bookings" count={meta?.total} onRefresh={() => load(1)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ChipGroup options={statusOptions} value={status} onChange={setStatus} />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
              title="Card View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </PanelBar>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length ? (
        <>
          {viewMode === "table" ? (
            <TableWrap>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Travellers</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{packageTitle(row)}</p>
                        <p className="text-xs text-slate-500">
                          {row.bookingReference || `#${String(extractUserId(row._id) || row._id).slice(-6).toUpperCase()}`} · {row.quantity ?? 1} × booking
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-semibold text-slate-900">{customerLabel(row)}</p>
                        {customerSub(row) && <p className="text-xs text-slate-500">{customerSub(row)}</p>}
                        {row.assignedTo && (
                          <p className="text-xs text-slate-500">
                            → {typeof row.assignedTo === "object" ? `${row.assignedTo.firstName || ""} ${row.assignedTo.lastName || ""}`.trim() : "Assigned"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.travellers?.length ?? row.details?.passengers ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{formatCurrency(row.totalAmount ?? row.details?.totalPrice)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3"><Pill tone={tone[row.status] || "slate"}>{row.status}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openEdit(row)}>Update</Button>
                          {row.status === "confirmed" && (
                            <>
                              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openAssign(row)}>Assign</Button>
                              <Button variant="ghost" className="!px-3 !py-1.5 !text-xs !text-red-700" onClick={() => handleCancel(row)}>Cancel</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => (
                <div key={row._id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {row.bookingType || "Package"}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {row.bookingReference || `#${String(extractUserId(row._id) || row._id).slice(-6).toUpperCase()}`}
                        </span>
                      </div>
                      <Pill tone={tone[row.status] || "slate"}>{row.status}</Pill>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          <UserRound size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">{customerLabel(row)}</p>
                          <p className="text-xs text-slate-500 truncate">{customerSub(row) || "No contact info"}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 space-y-1 text-xs">
                        <p className="font-semibold text-slate-800 line-clamp-1">{packageTitle(row)}</p>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>{row.quantity ?? 1} × booking · {row.travellers?.length ?? row.details?.passengers ?? 0} pax</span>
                          <span>{formatDate(row.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xs font-medium text-slate-500">Total Price</span>
                        <span className="text-base font-black text-slate-900">{formatCurrency(row.totalAmount ?? row.details?.totalPrice)}</span>
                      </div>
                      {row.assignedTo && (
                        <p className="text-[11px] text-slate-500">
                          Assigned: {typeof row.assignedTo === "object" ? `${row.assignedTo.firstName || ""} ${row.assignedTo.lastName || ""}`.trim() : "Staff Agent"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openEdit(row)}>Update</Button>
                    {row.status === "confirmed" && (
                      <>
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openAssign(row)}>Assign</Button>
                        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs !text-red-700" onClick={() => handleCancel(row)}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
              <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="No bookings found." />
      )}

      {/* Assign form */}
      {assignRow && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-bold text-slate-900">
            Assign — {packageTitle(assignRow)}
          </h4>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="max-w-md">
              <Field label="Operations Agent *">
                <select className={inputClass} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Select agent…</option>
                  {staff.map((person) => (
                    <option key={person._id} value={person._id}>
                      {`${person.firstName} ${person.lastName}`.trim()} — {person.role.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <FormActions onCancel={() => setAssignRow(null)} saving={working} label="Assign Booking" />
          </form>
        </div>
      )}

      {/* Non-structural edit form */}
      {editRow && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-1 text-sm font-bold text-slate-900">
            Update — {packageTitle(editRow)}
          </h4>
          <p className="mb-4 text-xs text-slate-500">
            Travel dates, contact details and remark only. Structural changes are rejected by backend guardrails.
          </p>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Travel Start">
                <input type="date" className={inputClass} value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
              </Field>
              <Field label="Travel End">
                <input type="date" className={inputClass} value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
              </Field>
              <Field label="Contact Email">
                <input type="email" className={inputClass} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </Field>
              <Field label="Contact Phone">
                <input className={inputClass} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <div className="xl:col-span-2">
                <Field label="Emergency Contact">
                  <input className={inputClass} value={edit.emergencyContact} onChange={(e) => setEdit({ ...edit, emergencyContact: e.target.value })} />
                </Field>
              </div>
              <div className="xl:col-span-2">
                <Field label="Operational Remark">
                  <input className={inputClass} value={edit.remark} onChange={(e) => setEdit({ ...edit, remark: e.target.value })} />
                </Field>
              </div>
            </div>
            <FormActions onCancel={() => setEditRow(null)} saving={working2} label="Save Changes" />
          </form>
        </div>
      )}
    </div>
  );
}
