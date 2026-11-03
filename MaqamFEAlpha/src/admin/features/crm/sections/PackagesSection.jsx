import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import formatCurrency from "../../../utils/formatCurrency";
import { crmApi } from "../crmApi";
import { packagesApi } from "../../packages/packagesApi";
import {
  PanelBar, SearchInput, Pill, TableWrap, EmptyState,
  Field, inputClass, FormActions,
} from "../crmUi";

const emptyTraveller = { firstName: "", lastName: "", email: "", phone: "" };

const emptyBooking = {
  quantity: "1",
  travellers: [{ ...emptyTraveller }],
  contactEmail: "",
  contactPhone: "",
  paymentReference: "",
  paymentNotes: "",
  startDate: "",
  endDate: "",
};

// Update form covers the backend patch contract:
// title, description, sellPrice, bundleDiscountPercentage.
const emptyUpdate = {
  title: "",
  description: "",
  sellPrice: "",
  bundleDiscountPercentage: "0",
};

export default function PackagesSection() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [bookingPackage, setBookingPackage] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [booking, setBooking] = useState(emptyBooking);
  const [saving, setSaving] = useState(false);

  const [editPackage, setEditPackage] = useState(null);
  const [update, setUpdate] = useState(emptyUpdate);
  const [updating, setUpdating] = useState(false);

  const load = async (page = 1, term = search) => {
    try {
      setLoading(true);
      const result = await packagesApi.list({ page, pageSize: 20, search: term });
      setPackages(result.data || []);
      setMeta({ total: result.meta?.total ?? 0, page: result.meta?.page ?? 1, totalPages: result.meta?.totalPages ?? 1 });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load packages.");
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

  const handleDeactivate = async (pkg) => {
    if (!window.confirm(`Deactivate "${pkg.title}"? It will be hidden from the storefront. Past bookings are kept.`)) return;
    try {
      await crmApi.deactivatePackage(pkg.id || pkg._id);
      toast.success("Package deactivated");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to deactivate package");
    }
  };

  const openUpdate = async (pkg) => {
    const id = pkg.id || pkg._id;
    if (editPackage?.id === id) {
      setEditPackage(null);
      return;
    }
    try {
      let fresh = null;
      try {
        fresh = await packagesApi.getById(id);
      } catch {
        fresh = await crmApi.getPackage(id);
      }
      fresh = fresh || pkg;
      setEditPackage({ ...pkg, ...fresh, id });
      setUpdate({
        title: fresh.title ?? pkg.title ?? "",
        description: fresh.description ?? pkg.description ?? "",
        sellPrice: fresh.sellPrice ?? pkg.sellPrice ?? "",
        bundleDiscountPercentage: fresh.bundleDiscountPercentage ?? pkg.bundleDiscountPercentage ?? 0,
      });
    } catch {
      setEditPackage({ ...pkg, id });
      setUpdate({
        title: pkg.title ?? "",
        description: pkg.description ?? "",
        sellPrice: pkg.sellPrice ?? "",
        bundleDiscountPercentage: pkg.bundleDiscountPercentage ?? 0,
      });
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const targetId = editPackage?.id || editPackage?._id;
    if (!targetId) {
      toast.error("Package ID not found");
      return;
    }
    try {
      setUpdating(true);
      const payload = {
        ...(String(update.title).trim() ? { title: String(update.title).trim() } : {}),
        ...(String(update.description).trim() ? { description: String(update.description).trim() } : {}),
        ...(update.sellPrice === "" ? {} : { sellPrice: Number(update.sellPrice) }),
        ...(update.bundleDiscountPercentage === "" ? {} : { bundleDiscountPercentage: Number(update.bundleDiscountPercentage) }),
      };
      try {
        await crmApi.updatePackage(targetId, payload);
      } catch {
        await packagesApi.update(targetId, payload);
      }
      toast.success("Package updated successfully");
      setEditPackage(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update package");
    } finally {
      setUpdating(false);
    }
  };

  const openBooking = async (pkg) => {
    setBookingPackage(pkg);
    setBooking(emptyBooking);
    if (!customers.length) {
      try {
        const result = await crmApi.listStaff({ role: "customer", limit: 100 });
        setCustomers(result.items || []);
      } catch {
        toast.error("Could not load customer list");
      }
    }
  };

  const updateTraveller = (index, key, value) => {
    setBooking((previous) => {
      const travellers = previous.travellers.map((traveller, i) =>
        i === index ? { ...traveller, [key]: value } : traveller,
      );
      return { ...previous, travellers };
    });
  };

  const addTraveller = () =>
    setBooking((previous) => ({
      ...previous,
      travellers: [...previous.travellers, { ...emptyTraveller }],
      quantity: String(previous.travellers.length + 1),
    }));

  const removeTraveller = (index) =>
    setBooking((previous) => {
      if (previous.travellers.length <= 1) return previous;
      const travellers = previous.travellers.filter((_, i) => i !== index);
      return { ...previous, travellers, quantity: String(travellers.length) };
    });

  const handleBooking = async (event) => {
    event.preventDefault();
    const lead = booking.travellers[0];
    if (!booking.customerId) {
      toast.error("Select a customer");
      return;
    }
    if (!lead.firstName.trim()) {
      toast.error("Lead traveller first name is required");
      return;
    }
    try {
      setSaving(true);
      await crmApi.bookForCustomer({
        customerId: booking.customerId,
        packageId: bookingPackage.id || bookingPackage._id,
        quantity: Number(booking.quantity || 1),
        travellers: booking.travellers.map((traveller, index) => ({
          ...traveller,
          isLead: index === 0,
        })),
        travelDates:
          booking.startDate && booking.endDate
            ? { startDate: booking.startDate, endDate: booking.endDate }
            : undefined,
        contactDetails: {
          email: booking.contactEmail || undefined,
          phone: booking.contactPhone || undefined,
        },
        payment: {
          method: "bank_transfer",
          referenceNumber: booking.paymentReference || undefined,
          notes: booking.paymentNotes || undefined,
        },
      });
      toast.success("Booking confirmed for customer");
      setBookingPackage(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page, search);
  };

  return (
    <div className="space-y-3">
      <PanelBar title="Packages" count={meta?.total} onRefresh={() => load(1, search)}>
        <SearchInput value={search} onChange={runSearch} placeholder="Search packages…" />
      </PanelBar>

      {loading ? (
        <LoadingSpinner />
      ) : packages.length ? (
        <>
          <TableWrap>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Sell Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id || pkg._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/packages/${pkg.id || pkg._id}`)}
                        className="text-left font-semibold text-slate-900 transition hover:text-emerald-700 hover:underline"
                        title="View package details"
                      >
                        {pkg.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pkg.destination || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(pkg.sellPrice)}</td>
                    <td className="px-4 py-3">
                      <Pill tone={pkg.isActive === false ? "slate" : "green"}>
                        {pkg.isActive === false ? "Inactive" : "Active"}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openUpdate(pkg)}>Quick Edit</Button>
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => navigate(`/admin/packages/${pkg.id || pkg._id}/edit`)}>Edit</Button>
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openBooking(pkg)}>Book</Button>
                        {pkg.isActive !== false && (
                          <Button variant="ghost" className="!px-3 !py-1.5 !text-xs !text-red-700" onClick={() => handleDeactivate(pkg)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {meta?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
              <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="No packages found." />
      )}

      {/* Update form (patch contract) */}
      {editPackage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold text-slate-900">
              Update — {update.title || "package"}
            </h4>
            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => navigate(`/admin/packages/${editPackage.id || editPackage._id}/edit`)}
            >
              Full Package Wizard →
            </Button>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Quick update title, description, sell price and bundle discount, or use the Full Package Wizard to modify bundled offers and itinerary.
          </p>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2">
                <Field label="Title">
                  <input className={inputClass} value={update.title} onChange={(e) => setUpdate({ ...update, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Sell Price (₹)">
                <input type="number" min={0} className={inputClass} value={update.sellPrice} onChange={(e) => setUpdate({ ...update, sellPrice: e.target.value })} />
              </Field>
              <Field label="Bundle Discount (%)">
                <input type="number" min={0} max={100} className={inputClass} value={update.bundleDiscountPercentage} onChange={(e) => setUpdate({ ...update, bundleDiscountPercentage: e.target.value })} />
              </Field>
              <div className="md:col-span-2 xl:col-span-4">
                <Field label="Description">
                  <textarea rows={2} className={inputClass} value={update.description} onChange={(e) => setUpdate({ ...update, description: e.target.value })} />
                </Field>
              </div>
            </div>
            <FormActions onCancel={() => setEditPackage(null)} saving={updating} label="Save Changes" />
          </form>
        </div>
      )}

      {/* Book-for-customer form */}
      {bookingPackage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-1 text-sm font-bold text-slate-900">
            Book — {bookingPackage.title}
          </h4>
          <p className="mb-4 text-xs text-slate-500">
            Confirms immediately against wholesale stock and records an offline bank transfer payment.
          </p>
          <form onSubmit={handleBooking} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2">
                <Field label="Customer *">
                  <select className={inputClass} value={booking.customerId || ""} onChange={(e) => setBooking({ ...booking, customerId: e.target.value })}>
                    <option value="">Select customer…</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {`${customer.firstName} ${customer.lastName}`.trim()} — {customer.phone || customer.email || customer._id}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Quantity">
                <input type="number" min={1} className={inputClass} value={booking.quantity} onChange={(e) => setBooking({ ...booking, quantity: e.target.value })} />
              </Field>
              <Field label="Travel Start">
                <input type="date" className={inputClass} value={booking.startDate} onChange={(e) => setBooking({ ...booking, startDate: e.target.value })} />
              </Field>
              <Field label="Travel End">
                <input type="date" className={inputClass} value={booking.endDate} onChange={(e) => setBooking({ ...booking, endDate: e.target.value })} />
              </Field>
              <Field label="Contact Email">
                <input type="email" className={inputClass} value={booking.contactEmail} onChange={(e) => setBooking({ ...booking, contactEmail: e.target.value })} />
              </Field>
              <Field label="Contact Phone">
                <input className={inputClass} value={booking.contactPhone} onChange={(e) => setBooking({ ...booking, contactPhone: e.target.value })} />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Travellers (first is lead)</p>
                <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={addTraveller}>Add traveller</Button>
              </div>
              <div className="space-y-2">
                {booking.travellers.map((traveller, index) => (
                  <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[auto_1fr_1fr_1fr_1fr_auto]">
                    <span className="flex items-center text-xs font-bold text-slate-500">{index === 0 ? "Lead" : index + 1}</span>
                    <input className={inputClass} placeholder="First name" value={traveller.firstName} onChange={(e) => updateTraveller(index, "firstName", e.target.value)} />
                    <input className={inputClass} placeholder="Last name" value={traveller.lastName} onChange={(e) => updateTraveller(index, "lastName", e.target.value)} />
                    <input className={inputClass} placeholder="Email (lead)" value={traveller.email} onChange={(e) => updateTraveller(index, "email", e.target.value)} />
                    <input className={inputClass} placeholder="Phone (lead)" value={traveller.phone} onChange={(e) => updateTraveller(index, "phone", e.target.value)} />
                    {booking.travellers.length > 1 && (
                      <Button type="button" variant="ghost" className="!px-2 !py-1.5 !text-xs !text-red-700" onClick={() => removeTraveller(index)}>✕</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Transfer Reference No.">
                <input className={inputClass} placeholder="UTR / REF123456" value={booking.paymentReference} onChange={(e) => setBooking({ ...booking, paymentReference: e.target.value })} />
              </Field>
              <Field label="Payment Notes">
                <input className={inputClass} value={booking.paymentNotes} onChange={(e) => setBooking({ ...booking, paymentNotes: e.target.value })} />
              </Field>
            </div>

            <FormActions onCancel={() => setBookingPackage(null)} saving={saving} label="Confirm Booking" />
          </form>
        </div>
      )}
    </div>
  );
}
