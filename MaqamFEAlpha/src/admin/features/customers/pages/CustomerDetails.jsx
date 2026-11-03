import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Users,
  Wallet,
  Calendar,
  Check,
  Copy,
  RefreshCw,
  Building2,
  Plane,
  Package,
  Clock,
  AlertCircle,
  Tag,
  CreditCard,
  ChevronRight,
  FileText,
  Download,
  Printer,
  Eye,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import DataSourceBadge from "../../../components/common/DataSourceBadge";
import TravelerTable from "../../../components/customers/TravelerTable";
import { customersApi } from "../customersApi";
import formatCurrency from "../../../utils/formatCurrency";
import { formatDate } from "../../../utils/formatDate";
import invoiceService from "../../../../services/invoiceService";

const bookingTypeIcons = {
  hotel: Building2,
  flight: Plane,
  package: Package,
};

const bookingStatusClasses = {
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [travellersData, setTravellersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Invoice View Area & Download State
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const iframeRef = useRef(null);

  const handleOpenInvoiceModal = async (b) => {
    const bookingId = b._id || b.id;
    if (!bookingId) {
      toast.error("No booking reference available for this reservation.");
      return;
    }

    const vertical = b.bookingType || "package";
    setSelectedInvoiceBooking({ ...b, vertical, bookingId });
    setViewInvoiceModalOpen(true);
    setInvoiceLoading(true);
    setInvoiceError(null);
    setInvoiceHtml("");

    try {
      const res = await invoiceService.getInvoiceHtml({
        vertical,
        bookingId: String(bookingId),
      });
      setInvoiceHtml(res.html);
    } catch (err) {
      console.error("Failed to load invoice HTML:", err);
      const msg = err?.message || "Failed to retrieve invoice from server.";
      setInvoiceError(msg);
      toast.error(msg);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDirectDownload = async (b) => {
    const bookingId = b._id || b.id;
    const vertical = b.bookingType || "package";
    if (!bookingId) return;

    try {
      setDownloadingInvoiceId(bookingId);
      const res = await invoiceService.downloadInvoice({
        vertical,
        bookingId: String(bookingId),
      });
      toast.success(`Official invoice downloaded: ${res.filename}`);
    } catch (err) {
      console.error("Direct invoice download failed:", err);
      toast.error(err?.message || "Failed to download invoice.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handlePrintInvoice = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.warn("iframe print failed, falling back to window.open print", err);
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(invoiceHtml);
          win.document.close();
          win.focus();
          win.print();
        }
      }
    }
  };

  const loadData = async (isManual = false) => {
    if (!id) return;
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [profileRes, travellersRes] = await Promise.all([
        customersApi.getById(id),
        customersApi.getTravellers(id).catch((err) => {
          console.warn("Could not load travellers:", err);
          return { travellers: [] };
        }),
      ]);

      setCustomer(profileRes);
      setTravellersData(travellersRes);
    } catch (err) {
      console.error("Failed to load customer profile:", err);
      const msg = err?.response?.data?.message || err?.message || "Customer not found";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const copyId = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner />
        <p className="mt-2 text-xs text-slate-500">Loading customer profile…</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/admin/customers")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft size={14} /> Back to Customers
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <h2 className="text-base font-bold text-red-800 dark:text-red-300">Customer Not Found</h2>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-sm mx-auto">
            {error || "No customer record exists matching this ID."}
          </p>
          <Button variant="secondary" className="mt-4 !py-1.5 !px-3 text-xs" onClick={() => loadData(true)}>
            <RefreshCw size={13} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const travellers = travellersData?.travellers || [];
  const currencyBreakdown = customer.currencyBreakdown || [];
  const recentBookings = customer.recentBookings || [];
  const initials = (customer.firstName?.[0] || customer.name?.[0] || "C").toUpperCase();
  const isActive = customer.isActive !== false;
  const customerId = customer._id || customer.id;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/admin/customers" className="hover:text-slate-800 dark:hover:text-white transition">
          Customers
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.name}</span>
      </nav>

      {/* Header Profile Block */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {customer.name}
                </h1>
                {customer.isVerified && (
                  <span title="Verified Customer" className="text-emerald-600">
                    <Check size={14} className="stroke-[3]" />
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-600" : "bg-slate-400"
                    }`}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-[11px]">{customerId}</span>
                <button
                  type="button"
                  onClick={() => copyId(customerId)}
                  className="hover:text-slate-800 dark:hover:text-slate-200"
                  title="Copy ID"
                >
                  <Copy size={11} />
                </button>
                <span>•</span>
                <span>Role: <strong className="capitalize font-semibold text-slate-700 dark:text-slate-300">{customer.role}</strong></span>
                {customer.createdAt && (
                  <>
                    <span>•</span>
                    <span>Customer since {formatDate(customer.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DataSourceBadge />
            <Button
              variant="secondary"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="!py-1.5 !px-3 text-xs"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Lifetime Spend
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {formatCurrency(customer.totalMoneySpent || 0)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Net captured expenditure</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Bookings
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {customer.totalBookingsCount ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">All-time reservations</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Booked Offers
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {customer.bookedOffersCount ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Retail offer purchases</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Saved Travellers
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {customer.totalTravellers ?? travellers.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Companion profiles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-semibold dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition ${
            activeTab === "overview"
              ? "border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Wallet size={14} />
          <span>Overview & Bookings</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("travellers")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition ${
            activeTab === "travellers"
              ? "border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Users size={14} />
          <span>Saved Travellers ({customer.totalTravellers ?? travellers.length})</span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.8fr]">
          {/* Left: Contact Info & Financials */}
          <div className="space-y-4">
            {/* Identity & Verification */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Contact & Identity
              </h2>
              <dl className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 dark:text-slate-400">Email Address</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                        {customer.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 dark:text-slate-400">Email Verified</dt>
                  <dd className="font-medium">
                    {customer.isVerified ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Verified</span>
                    ) : (
                      <span className="text-slate-400">Unverified</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 dark:text-slate-400">Phone Verified</dt>
                  <dd className="font-medium">
                    {customer.isPhoneVerified ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Verified</span>
                    ) : (
                      <span className="text-slate-400">Unverified</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 dark:text-slate-400">Account Created</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {customer.createdAt ? formatDate(customer.createdAt) : "—"}
                  </dd>
                </div>
                {customer.updatedAt && (
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-slate-500 dark:text-slate-400">Last Updated</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDate(customer.updatedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Currency Breakdown */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Spending by Currency
              </h2>
              {currencyBreakdown.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">No currency breakdown available.</p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {currencyBreakdown.map((cb, idx) => (
                    <div key={cb.currency || idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {cb.currency}
                        </span>
                        <span className="text-slate-400">
                          ({cb.transactions} tx)
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(cb.spent, cb.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Recent Bookings */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent Bookings & Reservations
              </h2>
              <span className="text-xs text-slate-400">
                {recentBookings.length} total
              </span>
            </div>

            {recentBookings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/20">
                No recent bookings on record for this customer.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5">Booking ID</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Date</th>
                      <th className="px-3 py-2.5 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentBookings.map((b) => {
                      const bId = b._id || b.id;
                      const Icon = bookingTypeIcons[b.bookingType] || Package;
                      const isConfirmed = String(b.status || "").toLowerCase().trim() === "confirmed";
                      const statusClass =
                        bookingStatusClasses[b.status?.toLowerCase()] ||
                        "bg-slate-100 text-slate-700";

                      return (
                        <tr key={bId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                            <span>{bId.slice(-8)}</span>
                            <button
                              type="button"
                              onClick={() => copyId(bId)}
                              className="ml-1 text-slate-400 hover:text-slate-600"
                              title="Copy Booking ID"
                            >
                              <Copy size={10} className="inline" />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 capitalize text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <Icon size={12} className="text-slate-400" />
                              {b.bookingType}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClass}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums dark:text-slate-400">
                            {b.createdAt ? formatDate(b.createdAt) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isConfirmed ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenInvoiceModal(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 text-[11px] font-bold transition shadow-2xs border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                  title="View official tax invoice"
                                >
                                  <FileText size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  <span>View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDirectDownload(b)}
                                  disabled={downloadingInvoiceId === bId}
                                  className="inline-flex items-center justify-center p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Download HTML invoice file"
                                >
                                  {downloadingInvoiceId === bId ? (
                                    <RefreshCw size={12} className="animate-spin text-emerald-600" />
                                  ) : (
                                    <Download size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono select-none">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Saved Travellers */}
      {activeTab === "travellers" && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saved Passenger Dossier
              </h2>
              <p className="text-xs text-slate-400">
                Passport credentials, dates of birth, and companion details
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {travellers.length} profiles
            </span>
          </div>

          <TravelerTable travelers={travellers} />
        </div>
      )}

      {/* CRM Invoice View Area Modal */}
      {viewInvoiceModalOpen && selectedInvoiceBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setViewInvoiceModalOpen(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Tax Invoice & Passenger Receipt
                    </h3>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Confirmed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Vertical: <strong className="capitalize">{selectedInvoiceBooking.vertical}</strong> • Booking ID #{selectedInvoiceBooking.bookingId} • Customer: {customer.name}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2">
                {invoiceHtml && !invoiceLoading && !invoiceError && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrintInvoice}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                      title="Print or Save as PDF"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">Print / Save PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectDownload(selectedInvoiceBooking)}
                      disabled={downloadingInvoiceId === selectedInvoiceBooking.bookingId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                      title="Download HTML invoice file"
                    >
                      {downloadingInvoiceId === selectedInvoiceBooking.bookingId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span className="hidden sm:inline">Download (.html)</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setViewInvoiceModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Invoice View Area */}
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-3 sm:p-6 flex flex-col items-center justify-center min-h-[350px]">
              {invoiceLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Retrieving statutory tax invoice from server...
                  </p>
                </div>
              ) : invoiceError ? (
                <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20 space-y-3">
                  <AlertCircle size={28} className="mx-auto text-red-500" />
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-300">
                    Failed to Load Invoice
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {invoiceError}
                  </p>
                  <Button
                    variant="secondary"
                    className="!py-1.5 !px-3 text-xs mx-auto"
                    onClick={() => handleOpenInvoiceModal(selectedInvoiceBooking)}
                  >
                    <RefreshCw size={12} /> Retry Loading
                  </Button>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center">
                  <iframe
                    ref={iframeRef}
                    title="Invoice Preview"
                    srcDoc={invoiceHtml}
                    className="w-full max-w-3xl h-[65vh] rounded-2xl bg-white shadow-md border border-slate-200 dark:border-slate-800"
                    sandbox="allow-same-origin allow-scripts allow-modals"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Statutory Tax Compliance (SAC 998555 / 996411 / 996311)</span>
              </span>
              <span>Computer-generated • Press Ctrl + P to Print / Save PDF</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
