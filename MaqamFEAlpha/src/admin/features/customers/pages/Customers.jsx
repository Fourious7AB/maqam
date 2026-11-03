import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Wallet,
  Tag,
  Check,
  Copy,
  AlertCircle,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import DataSourceBadge from "../../../components/common/DataSourceBadge";
import CustomerCard from "../../../components/customers/CustomerCard";
import CustomerTravellersModal from "../../../components/customers/CustomerTravellersModal";
import { customersApi } from "../customersApi";
import formatCurrency from "../../../utils/formatCurrency";
import { formatDate } from "../../../utils/formatDate";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { value: "createdAt:asc", label: "Oldest First", sortBy: "createdAt", sortOrder: "asc" },
  { value: "firstName:asc", label: "Name (A–Z)", sortBy: "firstName", sortOrder: "asc" },
  { value: "firstName:desc", label: "Name (Z–A)", sortBy: "firstName", sortOrder: "desc" },
  { value: "updatedAt:desc", label: "Recently Updated", sortBy: "updatedAt", sortOrder: "desc" },
];

export default function Customers() {
  const navigate = useNavigate();

  // Data
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [sortKey, setSortKey] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [viewMode, setViewMode] = useState("table");

  // Modal
  const [selectedCustomerForTravellers, setSelectedCustomerForTravellers] = useState(null);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Load customer data
  const loadCustomers = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const activeSort = SORT_OPTIONS.find((s) => s.value === sortKey) || SORT_OPTIONS[0];

      let isActiveParam;
      if (statusFilter === "active") isActiveParam = true;
      if (statusFilter === "inactive") isActiveParam = false;

      const res = await customersApi.list({
        page,
        limit,
        search: debouncedSearch,
        isActive: isActiveParam,
        sortBy: activeSort.sortBy,
        sortOrder: activeSort.sortOrder,
      });

      setCustomers(res.data || []);
      setMeta(
        res.meta || {
          total: res.data?.length || 0,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil((res.data?.length || 0) / limit)),
        }
      );
    } catch (err) {
      console.error("Failed to load customers:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to load customers";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, limit, debouncedSearch, statusFilter, sortKey]);

  // Metrics summary
  const metrics = useMemo(() => {
    const activeCount = customers.filter((c) => c.isActive !== false).length;
    const totalSpentSum = customers.reduce((sum, c) => sum + (c.totalMoneySpent || 0), 0);
    const totalTravellersSum = customers.reduce((sum, c) => sum + (c.totalTravellers || 0), 0);

    return {
      total: meta.total ?? customers.length,
      active: activeCount,
      totalSpent: totalSpentSum,
      totalTravellers: totalTravellersSum,
    };
  }, [customers, meta]);

  const copyId = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast.success("Customer ID copied");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Customers"
        subtitle="Manage customer identity profiles, linked travellers, and lifetime business records."
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge />
            <Button
              variant="secondary"
              onClick={() => loadCustomers(true)}
              disabled={loading || refreshing}
              className="!py-2 !px-3 text-xs"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Customers
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {metrics.total}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Registered accounts</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Accounts
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-400">
            {metrics.active}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">On current page</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Linked Travellers
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {metrics.totalTravellers}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Passports & companion profiles</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Page Net Spend
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums truncate dark:text-white">
            {formatCurrency(metrics.totalSpent)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Captured payments</p>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, or phone…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters & View */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setPage(1); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("active"); setPage(1); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "active"
                    ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("inactive"); setPage(1); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "inactive"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => { setSortKey(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Per-Page */}
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                title="Table view"
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1 transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                title="Card view"
                onClick={() => setViewMode("cards")}
                className={`rounded-md p-1 transition ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main View */}
      {loading ? (
        <div className="py-20 text-center">
          <LoadingSpinner />
          <p className="mt-2 text-xs text-slate-500">Loading customer records…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
          <p className="font-semibold">{error}</p>
          <Button variant="secondary" className="mt-3 !py-1.5 !px-3 text-xs" onClick={() => loadCustomers()}>
            <RefreshCw size={13} /> Retry
          </Button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users size={32} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-white">No customers found</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {debouncedSearch ? `No customer matches "${debouncedSearch}".` : "No customer accounts to display."}
          </p>
          {(debouncedSearch || statusFilter !== "all") && (
            <Button
              variant="secondary"
              className="mt-3 !py-1.5 !px-3 text-xs"
              onClick={() => { setSearch(""); setStatusFilter("all"); setPage(1); }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <CustomerCard
              key={c._id || c.id}
              customer={c}
              onOpen={(cust) => navigate(`/admin/customers/${cust._id || cust.id}`)}
              onViewTravellers={(cust) => setSelectedCustomerForTravellers(cust)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Travellers</th>
                  <th className="px-3 py-3 text-center">Offers</th>
                  <th className="px-4 py-3 text-right">Lifetime Spend</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => {
                  const id = c._id || c.id;
                  const isActive = c.isActive !== false;
                  const initials = (c.firstName?.[0] || c.name?.[0] || "C").toUpperCase();

                  return (
                    <tr
                      key={id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Name & ID */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                              <span
                                onClick={() => navigate(`/admin/customers/${id}`)}
                                className="hover:text-emerald-700 cursor-pointer transition-colors dark:hover:text-emerald-400"
                              >
                                {c.name}
                              </span>
                              {c.isVerified && (
                                <span title="Verified Account" className="text-emerald-600">
                                  <Check size={13} className="stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                              <span>{id.slice(-8)}</span>
                              <button
                                type="button"
                                title="Copy ID"
                                onClick={() => copyId(id)}
                                className="hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 align-middle text-xs">
                        <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                          {c.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone size={12} className="text-slate-400 flex-none" />
                              <span>{c.phone}</span>
                            </p>
                          )}
                          {c.email && (
                            <p className="flex items-center gap-1.5 truncate max-w-[190px]">
                              <Mail size={12} className="text-slate-400 flex-none" />
                              <span className="truncate">{c.email}</span>
                            </p>
                          )}
                          {!c.phone && !c.email && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 align-middle text-center">
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
                      </td>

                      {/* Travellers */}
                      <td className="px-3 py-3 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForTravellers(c)}
                          title="View saved travellers"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                        >
                          <Users size={12} className="text-slate-400" />
                          <span className="font-semibold tabular-nums">{c.totalTravellers}</span>
                        </button>
                      </td>

                      {/* Offers */}
                      <td className="px-3 py-3 align-middle text-center">
                        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {c.bookedOffersCount}
                        </span>
                      </td>

                      {/* Spend */}
                      <td className="px-4 py-3 align-middle text-right">
                        <span className="font-semibold text-slate-900 tabular-nums dark:text-white">
                          {formatCurrency(c.totalMoneySpent || 0)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 align-middle text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {c.createdAt ? formatDate(c.createdAt) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForTravellers(c)}
                            title="Quick Travellers Roster"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                          >
                            <Users size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/customers/${id}`)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition dark:bg-emerald-600 dark:hover:bg-emerald-500"
                          >
                            <span>Profile</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, meta.total)} of {meta.total}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium">
                {page} / {meta.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= (meta.totalPages || 1) || loading}
                onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Travellers Modal */}
      {selectedCustomerForTravellers && (
        <CustomerTravellersModal
          customerId={selectedCustomerForTravellers._id || selectedCustomerForTravellers.id}
          customerName={selectedCustomerForTravellers.name}
          onClose={() => setSelectedCustomerForTravellers(null)}
        />
      )}
    </div>
  );
}
