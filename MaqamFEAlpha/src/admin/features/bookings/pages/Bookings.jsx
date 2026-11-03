import { useEffect, useState } from "react";
import { 
  Plus, RefreshCw, Search, Users, Clock, AlertCircle, 
  CheckCircle, LayoutGrid, List, MapPin, Calendar, CreditCard, User 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import BookingStatus from "../../../components/bookings/BookingStatus";
import PaymentStatus from "../../../components/bookings/PaymentStatus";
import InventoryTable from "../../../components/inventory/InventoryTable";
import { bookingsApi } from "../bookingsApi";
import { useCrmUser, useCrmUserMap } from "../../crm/crmUserResolver";

export default function Bookings() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [filters, setFilters] = useState({ 
    search: "", 
    status: "all", 
    bookingType: "all" 
  });

  const userMap = useCrmUserMap(rows, (r) => r.customerId || r.userId || r.customer || r.user);

  const load = async () => {
    setLoading(true);
    try {
      const [bookingsData, summaryData] = await Promise.all([
        bookingsApi.listBookings(filters),
        bookingsApi.getSummary()
      ]);
      setRows(bookingsData?.rows || bookingsData?.bookings || []);
      setSummary(summaryData);
    } catch (e) {
      console.error("Failed to load bookings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 180);
    return () => clearTimeout(id);
  }, [filters.search, filters.status, filters.bookingType]);

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color} text-white`}>
        <Icon size={20} />
      </div>
      <div className="overflow-hidden">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-in pb-10">
      <PageHeader 
        title="Operations Desk" 
        subtitle="Master bookings management and operational oversight." 
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} className="hidden sm:flex">
              <RefreshCw size={16}/>Refresh
            </Button>
            <Button onClick={() => navigate("/admin/bookings/create")}>
              <Plus size={16}/> <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
        } 
      />

      {/* Summary Section */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={summary?.totalBookings || 0} icon={Users} color="bg-blue-500" />
        <StatCard label="Awaiting Ops" value={summary?.pendingActions?.awaitingOperations || 0} icon={Clock} color="bg-amber-500" />
        <StatCard label="Cancellations" value={summary?.pendingActions?.cancellationsCount || 0} icon={AlertCircle} color="bg-rose-500" />
        <StatCard label="Confirmed" value={summary?.byStatus?.confirmed || 0} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      {/* Controls Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_200px_200px] lg:grid-cols-[1fr_200px_200px_150px]">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={filters.search} 
              onChange={e => setFilters({...filters, search: e.target.value})} 
              placeholder="Search customer, reference, or destination..." 
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
            />
          </div>
          
          <select 
            value={filters.status} 
            onChange={e => setFilters({...filters, status: e.target.value})} 
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
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
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="all">All Types</option>
            <option value="package">Packages</option>
            <option value="offer">Offers</option>
            <option value="flight">Flights</option>
            <option value="hotel">Hotels</option>
            <option value="visa">Visas</option>
          </select>

          <div className="flex items-center justify-end gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("table")} 
              className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
              title="Table View"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode("grid")} 
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-20 text-center text-sm text-slate-500 border border-slate-200 shadow-sm">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-slate-300" />
          Loading master bookings list...
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            <InventoryTable 
              rows={rows} 
              columns={[
                {
                  key: "bookingNumber", 
                  label: "Booking Ref", 
                  render: r => (
                    <button 
                      onClick={() => navigate(`/admin/bookings/${r.id}`)} 
                      className="text-left group"
                    >
                      <span className="font-bold text-emerald-700 group-hover:underline">{r.bookingNumber}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          {r.bookingType}
                        </span>
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
                      <div className="max-w-[200px] truncate">
                        <p className="font-medium text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">{email}</p>
                      </div>
                    );
                  }
                },
                { 
                  key: "destination", 
                  label: "Destination", 
                  render: r => <span className="text-sm text-slate-700">{r.destination}</span> 
                },
                { 
                  key: "paxCount", 
                  label: "Pax", 
                  render: r => <span className="text-sm font-medium">{r.paxCount}</span> 
                },
                { 
                  key: "status", 
                  label: "Status", 
                  render: r => <BookingStatus status={r.status} /> 
                },
                { 
                  key: "payment", 
                  label: "Payment", 
                  render: r => <PaymentStatus status={r.paymentStatus} /> 
                },
                { 
                  key: "assignedTo", 
                  label: "Agent", 
                  render: r => r.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                        {r.assignedTo.name.charAt(0)}
                      </div>
                      <span className="text-xs text-slate-600 truncate max-w-[100px]">{r.assignedTo.name}</span>
                    </div>
                  ) : <span className="text-xs text-slate-400 italic">Unassigned</span> 
                },
                { 
                  key: "pricing", 
                  label: "Total", 
                  render: r => <span className="font-bold text-slate-900">₹{Number(r.totalAmount || 0).toLocaleString("en-IN")}</span> 
                },
              ]} 
            />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map(r => (
                <BookingCard key={r.id} booking={r} onClick={() => navigate(`/admin/bookings/${r.id}`)} />
              ))}
              {rows.length === 0 && (
                <div className="col-span-full p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  No bookings found matching the filters.
                </div>
              )}
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
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
    >
      <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold">
            {booking.bookingType}
          </span>
          <span className="text-xs font-mono text-slate-500">{booking.bookingNumber}</span>
        </div>
        <BookingStatus status={booking.status} />
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 truncate">{customerName}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin size={14} className="text-slate-400" />
            <span className="truncate">{booking.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span className="truncate">{booking.createdAt?.slice(0,10)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users size={14} className="text-slate-400" />
            <span>{booking.paxCount} Pax</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CreditCard size={14} className="text-slate-400" />
            <PaymentStatus status={booking.paymentStatus} />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] flex items-center justify-center font-bold">
              {booking.assignedTo?.name?.charAt(0) || "?"}
            </div>
            <span className="text-[11px] text-slate-500 truncate max-w-[80px]">
              {booking.assignedTo?.name || "Unassigned"}
            </span>
          </div>
          <p className="font-black text-slate-900 text-sm">
            ₹{Number(booking.totalAmount || 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      
      <div className="p-2 bg-slate-50 text-center">
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
          View Full Dossier →
        </span>
      </div>
    </div>
  );
}
