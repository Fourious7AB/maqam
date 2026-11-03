// Package Booking Operations Desk.
//
// Shows all CRM bookings across types (all/package/offer/flight/hotel/visa)
// with live metrics, multi-dimensional filters, server-backed pagination,
// row actions, and modals for Edit, Assign, Add Remark, and Stock Release.

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Edit3, MessageSquarePlus, Plus, RefreshCw,
  Search, Trash2, UserPlus, Eye,
} from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import BookingStatus from '../../../components/bookings/BookingStatus';
import PaymentStatus from '../../../components/bookings/PaymentStatus';
import StockPagination from '../../../components/inventory/StockPagination';

import { bookingsApi } from '../bookingsApi';
import { bookingKeys, OPERATIONAL_QUERY_OPTIONS, REFERENCE_QUERY_OPTIONS } from '../bookingQueryKeys';
import {
  formatAmount, formatDateRange, dedupeBookings,
} from '../bookingNormalizers';
import { useCrmUserMap } from '../../crm/crmUserResolver';
import {
  AssignAgentModal, CancelBookingModal, EditBookingModal, RemarkModal,
} from '../components/BookingModals';
import { EmptyState, ErrorState, TableSkeleton } from '../components/BookingStates';

const PAGE_SIZE = 10;

const TYPE_TABS = [
  { key: 'all', label: 'All Operations' },
  { key: 'package', label: 'Packages' },
  { key: 'offer', label: 'Offers' },
  { key: 'flight', label: 'Flights' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'visa', label: 'Visas' },
];

function MetricCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-[11px] font-bold uppercase tracking-wide ${color}`}>{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

export default function PackageBookingManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [bookingType, setBookingType] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [assignedAgent, setAssignedAgent] = useState('all');

  const [assignTarget, setAssignTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [remarkTarget, setRemarkTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const summaryQuery = useQuery({
    queryKey: bookingKeys.summary(),
    ...OPERATIONAL_QUERY_OPTIONS,
    queryFn: bookingsApi.getSummary,
  });

  const listParams = useMemo(() => ({
    bookingType: bookingType === 'all' ? undefined : bookingType,
    page,
    limit: PAGE_SIZE,
    status: status === 'all' ? undefined : status,
    paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
    search: search.trim() || undefined,
  }), [bookingType, page, status, paymentStatus, search]);

  const listQuery = useQuery({
    queryKey: bookingKeys.list(listParams),
    ...OPERATIONAL_QUERY_OPTIONS,
    queryFn: () => bookingsApi.list(listParams),
  });

  const agentsQuery = useQuery({
    queryKey: bookingKeys.agentList(),
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: bookingsApi.listAgents,
  });

  const summary = summaryQuery.data ?? {};
  const rows = useMemo(() => dedupeBookings(listQuery.data?.rows ?? []), [listQuery.data?.rows]);
  const pagination = listQuery.data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

  const visibleRows = useMemo(() => {
    if (assignedAgent === 'all') return rows;
    if (assignedAgent === 'unassigned') return rows.filter((r) => !r.assignedTo);
    return rows.filter((r) => r.assignedTo?.id === assignedAgent);
  }, [rows, assignedAgent]);

  const userMap = useCrmUserMap(visibleRows, (r) => r.customerId || r.userId || r.customer || r.user);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: bookingKeys.bookingsRoot() });
  };



  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="CRM Package Booking Operations Desk"
        subtitle="Manage customer reservations, track live wholesale stock allocations, and process operational actions."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRefresh}>
              <RefreshCw size={16} /> Refresh
            </Button>
            <Button onClick={() => navigate('/admin/bookings/create')}>
              <Plus size={16} /> Create Booking
            </Button>
          </div>
        }
      />

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Bookings" value={summary.totalBookings ?? 0} color="text-blue-600" />
        <MetricCard label="Pending Actions" value={summary.pendingActions?.awaitingOperations ?? 0} color="text-amber-600" />
        <MetricCard label="Confirmed" value={summary.byStatus?.confirmed ?? 0} color="text-emerald-600" />
        <MetricCard label="Pending" value={summary.byStatus?.pending ?? 0} color="text-slate-600" />
        <MetricCard label="Cancelled" value={summary.byStatus?.cancelled ?? 0} color="text-rose-600" />
        <MetricCard label="Revenue" value={formatAmount(summary.totalRevenue ?? 0, 'INR')} color="text-emerald-700" />
      </div>

      {/* Booking Type Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-bold">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setBookingType(tab.key);
              setPage(1);
            }}
            className={`rounded-xl px-4 py-2 transition ${
              bookingType === tab.key
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_150px_150px_160px]">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search reference, customer or destination…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>

        <select
          value={assignedAgent}
          onChange={(event) => setAssignedAgent(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Agents</option>
          <option value="unassigned">Unassigned</option>
          {(agentsQuery.data ?? []).map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </div>



      {/* Main Table Area */}
      {listQuery.isLoading ? (
        <TableSkeleton rows={PAGE_SIZE} columns={8} />
      ) : listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title="Could not load bookings"
          onRetry={() => listQuery.refetch()}
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="No bookings match your filters"
          hint="Try adjusting the filters or issue a new package booking for a customer."
          action={{
            label: 'Create Package Booking',
            onClick: () => navigate('/admin/bookings/create'),
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Package / Item</th>
                  <th className="px-4 py-3">Travel Dates</th>
                  <th className="px-4 py-3">PAX</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/bookings/${r.id}`)}
                        className="text-left font-bold text-emerald-700 hover:underline"
                      >
                        {r.bookingNumber}
                      </button>
                      <div className="mt-0.5 text-[10px] text-slate-400 capitalize">{r.bookingType}</div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {(r.customerName && r.customerName !== 'Customer') ? r.customerName : userMap.getName(r.customerId || r.userId, 'Customer')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.customerEmail || userMap.getEmail(r.customerId || r.userId) || r.customerPhone || userMap.getPhone(r.customerId || r.userId) || '—'}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 line-clamp-1">{r.packageName}</p>
                      {r.destination && (
                        <p className="text-[11px] text-slate-400">{r.destination}</p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDateRange(r.travelDates)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {r.paxCount}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {formatAmount(r.totalAmount, r.currency)}
                    </td>

                    <td className="px-4 py-3">
                      <PaymentStatus status={r.paymentStatus} />
                    </td>

                    <td className="px-4 py-3">
                      <BookingStatus status={r.status} />
                    </td>

                    <td className="px-4 py-3">
                      {r.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                            {r.assignedTo.name?.charAt(0) || 'A'}
                          </span>
                          <span className="truncate max-w-[100px] text-slate-700">{r.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Unassigned</span>
                      )}
                    </td>



                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/bookings/${r.id}`)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="View 360° dossier"
                        >
                          <Eye size={15} />
                        </button>
                        {r.bookingType === 'package' && (
                          <button
                            onClick={() => setEditTarget(r)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Edit dates & contacts"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setAssignTarget(r)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          title="Assign staff agent"
                        >
                          <UserPlus size={15} />
                        </button>
                        <button
                          onClick={() => setRemarkTarget(r)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          title="Add operational remark"
                        >
                          <MessageSquarePlus size={15} />
                        </button>
                        {r.status !== 'cancelled' && (
                          <button
                            onClick={() => setCancelTarget(r)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Cancel booking & release stock"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 p-3">
            <StockPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}

      {/* Operational Modals */}
      <AssignAgentModal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        booking={assignTarget}
      />
      <EditBookingModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        booking={editTarget}
      />
      <RemarkModal
        open={Boolean(remarkTarget)}
        onClose={() => setRemarkTarget(null)}
        booking={remarkTarget}
      />
      <CancelBookingModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        booking={cancelTarget}
      />
    </div>
  );
}
