import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, LayoutGrid, List, UserRound } from "lucide-react";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import BookingStatus from "../../../components/bookings/BookingStatus";
import PaymentStatus from "../../../components/bookings/PaymentStatus";
import InventoryTable from "../../../components/inventory/InventoryTable";
import { bookingsApi } from "../bookingsApi";
import { useCrmUser, useCrmUserMap } from "../../crm/crmUserResolver";
import { useNavigate } from "react-router-dom";

export default function BookingManager() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("table");
  const [filters, setFilters] = useState({ 
    search: "", 
    status: "all", 
    bookingType: "all" 
  });

  // 1. Use TanStack Query for Summary Metrics
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ["crm-bookings-summary"],
    queryFn: bookingsApi.getSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // 2. Use TanStack Query for Bookings List
  const { 
    data: bookingsData, 
    isLoading: bookingsLoading, 
    refetch: refetchBookings 
  } = useQuery({
    queryKey: ["crm-bookings", filters],
    queryFn: () => bookingsApi.listBookings(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const rows = bookingsData?.rows || bookingsData?.bookings || [];
  const userMap = useCrmUserMap(rows, (r) => r.customerId || r.userId || r.customer || r.user);
  const loading = summaryLoading || bookingsLoading;

  const handleRefresh = () => {
    refetchSummary();
    refetchBookings();
  };

  return (
    <div className="space-y-6 animate-slide-in pb-10">
      <PageHeader 
        title="Booking Manager" 
        subtitle="Master list of all bookings across packages, hotels, flights and visas." 
        actions={<Button variant="secondary" onClick={handleRefresh}><RefreshCw size={16}/>Refresh</Button>}
      />

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Metric label="Total Bookings" value={summary?.totalBookings || 0} color="text-blue-600" />
        <Metric label="Pending Ops" value={summary?.pendingActions?.awaitingOperations || 0} color="text-amber-600" />
        <Metric label="Cancellations" value={summary?.pendingActions?.cancellationsCount || 0} color="text-rose-600" />
        <Metric label="Confirmed" value={summary?.byStatus?.confirmed || 0} color="text-emerald-600" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid gap-3 md:grid-cols-[1fr_200px_200px_120px]">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={filters.search} 
            onChange={e => setFilters({...filters, search: e.target.value})} 
            placeholder="Search customer, reference or destination..." 
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
          />
        </div>
        <select 
          value={filters.status} 
          onChange={e => setFilters({...filters, status: e.target.value})} 
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
          <option value="completed">Completed</option>
        </select>
        <select 
          value={filters.bookingType} 
          onChange={e => setFilters({...filters, bookingType: e.target.value})} 
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
        >
          <option value="all">All Types</option>
          <option value="package">Packages</option>
          <option value="offer">Offers</option>
          <option value="flight">Flights</option>
          <option value="hotel">Hotels</option>
          <option value="visa">Visas</option>
        </select>
        <div className="flex items-center justify-end gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}><List size={18}/></button>
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}><LayoutGrid size={18}/></button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-20 text-center text-sm text-slate-500 border border-slate-200 shadow-sm">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-slate-300" />
          Loading bookings...
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            <InventoryTable rows={rows} columns={[
              {
                key: "bookingNumber", 
                label: "Booking Ref", 
                render: r => (
                  <button onClick={() => navigate(`/admin/bookings/${r.id}`)} className="text-left group">
                    <span className="font-bold text-emerald-700 group-hover:underline">{r.bookingNumber}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">{r.bookingType}</span>
                      <span className="text-[10px] text-slate-400">{r.createdAt?.slice(0,10)}</span>
                    </div>
                  </button>
                )
              },
              { 
                key: "customerName", 
                label: "Customer", 
                render: r => {
                  const name = (r.customerName && r.customerName !== "Customer")
                    ? r.customerName
                    : userMap.getName(r.customerId || r.userId, "Customer");
                  const email = r.customerEmail || r.email || userMap.getEmail(r.customerId || r.userId);
                  return (
                    <div>
                      <p className="font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{email}</p>
                    </div>
                  );
                } 
              },
              { key: "destination", label: "Destination", render: r => <span className="text-sm text-slate-700">{r.destination}</span> },
              { key: "paxCount", label: "Pax", render: r => <span className="text-sm font-medium">{r.paxCount}</span> },
              { key: "status", label: "Status", render: r => <BookingStatus status={r.status} /> },
              { key: "payment", label: "Payment", render: r => <PaymentStatus status={r.paymentStatus} /> },
              { 
                key: "assignedTo", 
                label: "Agent", 
                render: r => r.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">{r.assignedTo.name.charAt(0)}</div>
                    <span className="text-xs text-slate-600">{r.assignedTo.name}</span>
                  </div>
                ) : <span className="text-xs text-slate-400 italic">Unassigned</span> 
              },
              { key: "pricing", label: "Total", render: r => <span className="font-bold text-slate-900">₹{Number(r.totalAmount || 0).toLocaleString("en-IN")}</span> },
            ]} />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map(r => <BookingCard key={r.id} booking={r} onClick={() => navigate(`/admin/bookings/${r.id}`)} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({ booking, onClick }) {
  const { name: resolvedName, email: resolvedEmail } = useCrmUser(booking.customerId || booking.userId);
  const customerName = (booking.customerName && booking.customerName !== "Customer")
    ? booking.customerName
    : (resolvedName || "Customer");
  const email = booking.customerEmail || booking.email || resolvedEmail || "";

  return (
    <div onClick={onClick} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold">{booking.bookingType}</span>
          <span className="text-xs font-mono text-slate-500">{booking.bookingNumber}</span>
        </div>
        <BookingStatus status={booking.status} />
      </div>
      <div className="p-4 space-y-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserRound size={20}/></div>
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 truncate">{customerName}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600"><span className="text-slate-400">📍</span> <span className="truncate">{booking.destination}</span></div>
          <div className="flex items-center gap-2 text-xs text-slate-600"><span className="text-slate-400">📅</span> <span className="truncate">{booking.createdAt?.slice(0,10)}</span></div>
          <div className="flex items-center gap-2 text-xs text-slate-600"><span className="text-slate-400">👥</span> <span>{booking.paxCount} Pax</span></div>
          <div className="flex items-center gap-2 text-xs text-slate-600"><span className="text-slate-400">💳</span> <PaymentStatus status={booking.paymentStatus} /></div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] flex items-center justify-center font-bold">{booking.assignedTo?.name?.charAt(0) || "?"}</div>
            <span className="text-[11px] text-slate-500 truncate max-w-[80px]">{booking.assignedTo?.name || "Unassigned"}</span>
          </div>
          <p className="font-black text-slate-900 text-sm">₹{Number(booking.totalAmount || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>
      <div className="p-2 bg-slate-50 text-center">
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">View Full Dossier →</span>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-[11px] font-bold uppercase tracking-wide ${color}`}>{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
