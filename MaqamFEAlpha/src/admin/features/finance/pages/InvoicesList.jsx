import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Receipt,
  Plane,
  Hotel,
  Package,
  TicketCheck,
  Tag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import StatusBadge from "../../../components/common/StatusBadge";
import { env } from "../../../config/env";

export default function InvoicesList() {
  const [vertical, setVertical] = useState("packages"); // packages | offers | visas | flights | hotels
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });

  // 1. Fetch Summary Metrics
  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/crm/invoices/summary");
      const data = res?.data?.data || res?.data || {};
      setSummary(data);
    } catch (err) {
      console.warn("Failed to fetch invoices summary:", err?.message);
    }
  }, []);

  // 2. Fetch Vertical Invoices
  const fetchInvoices = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const endpoint = `/api/v1/crm/invoices/${vertical}`;
      const params = {
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const res = await apiClient.get(endpoint, { params });
      const payload = res?.data?.data || res?.data || {};
      const list = Array.isArray(payload) ? payload : (payload.invoices || payload.bookings || payload.data || []);
      setInvoices(list);
      setMeta(res?.data?.meta || { total: list.length, page, limit: 20 });
    } catch (err) {
      console.warn(`Failed to fetch ${vertical} invoices:`, err?.message);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vertical, page, search, statusFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownload = (id) => {
    const directBase = env.directApiBaseUrl || env.apiBaseUrl || "";
    const cleanBase = directBase.replace(/\/+$/, "");
    const token =
      localStorage.getItem("maqam_admin_token") ||
      localStorage.getItem("maqam_auth_token") ||
      localStorage.getItem("accessToken") ||
      "";
    const downloadUrl = `${cleanBase}/api/v1/crm/invoices/${vertical.replace(/s$/, "")}/${id}/download?token=${encodeURIComponent(token)}`;
    window.open(downloadUrl, "_blank");
  };

  const handlePreviewHtml = (id) => {
    const directBase = env.directApiBaseUrl || env.apiBaseUrl || "";
    const cleanBase = directBase.replace(/\/+$/, "");
    const token =
      localStorage.getItem("maqam_admin_token") ||
      localStorage.getItem("maqam_auth_token") ||
      localStorage.getItem("accessToken") ||
      "";
    const htmlUrl = `${cleanBase}/api/v1/crm/invoices/${vertical.replace(/s$/, "")}/${id}/html?token=${encodeURIComponent(token)}`;
    window.open(htmlUrl, "_blank");
  };

  const verticalTabs = [
    { key: "packages", label: "Tour Packages", icon: Package, count: summary?.byVertical?.package?.count },
    { key: "offers", label: "Retail Offers", icon: Tag, count: summary?.byVertical?.offer?.count },
    { key: "visas", label: "Visa Batches", icon: TicketCheck, count: summary?.byVertical?.visa?.count },
    { key: "flights", label: "Flights (GDS/LCC)", icon: Plane, count: summary?.byVertical?.flight?.count },
    { key: "hotels", label: "Hotels", icon: Hotel, count: summary?.byVertical?.hotel?.count },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Receipt size={18} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Cross-Vertical Invoices & Billing Desk
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit-ready GST tax invoices, statutory compliance, and one-click PDF downloads across all operational verticals.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSummary();
            fetchInvoices(true);
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Gross Billed Revenue</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            ₹{summary?.totalGrossBilled != null ? Number(summary.totalGrossBilled).toLocaleString("en-IN") : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">Across all active verticals</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Invoices</div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {summary?.totalInvoices != null ? summary.totalInvoices : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">Generated tax files</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tour Packages Billed</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            ₹{summary?.byVertical?.package?.billedAmount != null ? Number(summary.byVertical.package.billedAmount).toLocaleString("en-IN") : "0"}
          </div>
          <p className="mt-1 text-xs text-slate-500">5% Tour Operator GST</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Flight & Hotel Markup</div>
          <div className="mt-2 text-2xl font-black text-teal-700 dark:text-teal-400">
            ₹{((summary?.byVertical?.flight?.billedAmount || 0) + (summary?.byVertical?.hotel?.billedAmount || 0)).toLocaleString("en-IN")}
          </div>
          <p className="mt-1 text-xs text-slate-500">18% GST on Commercial Markup</p>
        </div>
      </div>

      {/* Vertical Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {verticalTabs.map((t) => {
          const Icon = t.icon;
          const isActive = vertical === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setVertical(t.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {t.count != null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${vertical} by invoice #, booking ID, customer name, email or phone...`}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950/40"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950/40"
          >
            <option value="all">All Payment Statuses</option>
            <option value="confirmed">Confirmed / Paid</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Data Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <LoadingSpinner size="lg" message={`Loading ${vertical} invoices...`} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileText size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">No invoices found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            There are no {vertical} billing records matching your current query.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Invoice / Ref</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Service Details</th>
                  <th className="px-4 py-3.5">Gross Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((row) => {
                  const id = row._id || row.id || row.bookingId;
                  const invoiceNo = row.invoiceNumber || row.bookingId || id;
                  const customerName =
                    row.customer?.name ||
                    row.contactDetails?.name ||
                    [row.customer?.firstName, row.customer?.lastName].filter(Boolean).join(" ") ||
                    row.leadName ||
                    "Customer";
                  const customerEmail = row.customer?.email || row.contactDetails?.email || row.email || "";
                  const customerPhone = row.customer?.phone || row.contactDetails?.phone || row.phone || "";
                  const amount = row.totalGross || row.totalAmount || row.grossRevenue || row.price || row.amount || 0;
                  const status = row.paymentStatus || row.status || "confirmed";
                  const dateStr = row.createdAt || row.issuedAt || row.travelDates?.from || "";

                  return (
                    <tr key={id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        <span className="font-mono text-emerald-700 dark:text-emerald-400">
                          {String(invoiceNo).slice(-10).toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{customerName}</div>
                        <div className="text-[11px] text-slate-400">{customerEmail || customerPhone}</div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {row.packageName || row.offerTitle || row.hotelName || row.flightDetails?.airline || `${vertical} booking`}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        ₹{Number(amount).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={status} />
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { dateStyle: "short" }) : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePreviewHtml(id)}
                            title="Preview Invoice HTML"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Eye size={12} />
                            Preview
                          </button>

                          <button
                            onClick={() => handleDownload(id)}
                            title="Download PDF Tax Invoice"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition hover:bg-emerald-800"
                          >
                            <Download size={12} />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
