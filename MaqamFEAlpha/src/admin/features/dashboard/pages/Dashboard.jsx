import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import LoadingSpinner from '../../../components/common/LoadingSpinner';
import DataSourceBadge from '../../../components/common/DataSourceBadge';
import { useAuthStore } from '../../../store/authStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { bookingsApi } from '../../bookings/bookingsApi';
import { bookingKeys, OPERATIONAL_QUERY_OPTIONS } from '../../bookings/bookingQueryKeys';
import { packagesApi } from '../../packages/packagesApi';
import { dashboardApi } from '../dashboardApi';
import { financeApi } from '../../finance/financeApi';
import { stocksApi } from '../../inventory/stocks/stocksApi';
import { useStocksOverview } from '../../inventory/stocks/useStocksOverview';
import { visaApi } from '../../inventory/visa/visaApi';
import BookingStatusInsight from '../components/BookingStatusInsight';
import DashboardSnapshot from '../components/DashboardSnapshot';
import OperationsTable from '../components/OperationsTable';
import QuickAccess from '../components/QuickAccess';
import RevenueInsight from '../components/RevenueInsight';
import SnapshotExplorer from '../components/SnapshotExplorer';
import TravelPulse from '../components/TravelPulse';
import DashboardQuickSearch from '../components/DashboardQuickSearch';
import { countOf, getDisplayName, normalizeBooking, normalizeRevenue, toArray } from '../dashboardData';
import '../dashboard.css';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const dashboardTabs = [
  { label: 'Overview', to: '/admin/dashboard', end: true },
  { label: 'Bookings', to: '/admin/bookings' },
  { label: 'Inventory', to: '/admin/inventory/flights' },
  { label: 'Finance', to: '/admin/finance' },
];

function DashboardContext({ displayName }) {
  return (
    <header className="dashboard-context">
      <div className="dashboard-context-row">
        <div className="dashboard-heading">
          <h1 className="dashboard-title">{getGreeting()}, {displayName}</h1>
          <p className="dashboard-subtitle">Admin Console · Today · Keep every journey moving.</p>
          <p className="dashboard-route">Route /admin/dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge />
          <DashboardQuickSearch />
        </div>
      </div>
      <nav className="dashboard-tabs" aria-label="Dashboard views">
        {dashboardTabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `dashboard-tab ${isActive ? 'is-active' : ''}`}>{tab.label}</NavLink>
        ))}
      </nav>
    </header>
  );
}

function DashboardError({ onRetry }) {
  return (
    <div className="dashboard-error" role="alert">
      <h2>Dashboard data is temporarily unavailable</h2>
      <p>We could not load the live operations snapshot. Your admin navigation is still available while you retry.</p>
      <button type="button" className="dashboard-action-button dashboard-action-quiet" onClick={onRetry}>Retry dashboard</button>
    </div>
  );
}

function getBookingCounts(results) {
  const [pending, paymentPending, cancelled, rejected, confirmed] = results.map((result) => (result.status === 'fulfilled' ? countOf(result.value) : 0));
  return { pending, paymentPending, cancelled, rejected, confirmed };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [operationsSearch, setOperationsSearch] = useState('');
  const [operationsStatus, setOperationsStatus] = useState('all');
  // Which snapshot drill-down panel is open: null | 'bookings' | 'inventory'.
  const [explorerMode, setExplorerMode] = useState(null);
  const toggleExplorer = (mode) => setExplorerMode((current) => (current === mode ? null : mode));

  const stocksQuery = useStocksOverview();
  const visaQuery = useQuery({ queryKey: ['visa', 'dashboard'], queryFn: () => visaApi.getDashboard() });
  const financeQuery = useQuery({ queryKey: ['finance', 'overview'], queryFn: () => financeApi.getOverview() });
  const revenueQuery = useQuery({ queryKey: ['dashboard', 'revenue'], queryFn: () => dashboardApi.getOverview() });
  const summaryQuery = useQuery({
    queryKey: bookingKeys.summary(),
    ...OPERATIONAL_QUERY_OPTIONS,
    queryFn: bookingsApi.getSummary,
  });
  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'status-counts'],
    ...OPERATIONAL_QUERY_OPTIONS,
    queryFn: async () => {
      const summary = await bookingsApi.getSummary();
      return {
        pending: summary.byStatus?.pending ?? 0,
        paymentPending: summary.pendingActions?.awaitingOperations ?? 0,
        cancelled: summary.byStatus?.cancelled ?? 0,
        rejected: summary.byStatus?.failed ?? 0,
        confirmed: summary.byStatus?.confirmed ?? 0,
      };
    },
  });
  const bookingsRowsQuery = useQuery({
    queryKey: bookingKeys.list({ page: 1, limit: 5 }),
    ...OPERATIONAL_QUERY_OPTIONS,
    queryFn: () => bookingsApi.list({ page: 1, limit: 5 }),
  });
  const airlinesQuery = useQuery({
    queryKey: ['stocks', 'airlines'],
    queryFn: async () => {
      const { stocks } = await stocksApi.listFlights({ page: 1, limit: 100 });
      return new Set(stocks.map((stock) => stock.airline).filter(Boolean)).size;
    },
  });
  const hotelCountQuery = useQuery({
    queryKey: ['dashboard', 'hotel-count'],
    queryFn: async () => {
      const { pagination } = await stocksApi.listHotels({ page: 1, limit: 1 });
      return Number(pagination?.total ?? 0);
    },
  });
  const inventoryCountQuery = useQuery({
    queryKey: ['dashboard', 'inventory-count'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        stocksApi.listFlights({ page: 1, limit: 1 }),
        stocksApi.listHotels({ page: 1, limit: 1 }),
        visaApi.listInventory({ page: 1, limit: 1 }),
        packagesApi.list({ page: 1, pageSize: 1 }),
      ]);
      return results.reduce((sum, result) => sum + (result.status === 'fulfilled' ? countOf(result.value) : 0), 0);
    },
  });

  const loading = stocksQuery.isLoading || visaQuery.isLoading || financeQuery.isLoading || bookingsQuery.isLoading;
  const dashboardQueries = [stocksQuery, visaQuery, financeQuery, bookingsQuery, revenueQuery];
  const allDashboardQueriesFailed = dashboardQueries.every((query) => query.isError);
  const displayName = getDisplayName(user);
  const stocks = stocksQuery.data || {};
  const flights = stocks.flights || {};
  const hotels = stocks.hotels || {};
  const visa = visaQuery.data || {};
  const finance = financeQuery.data || {};
  const bookings = bookingsQuery.data || { pending: 0, paymentPending: 0, cancelled: 0, rejected: 0, confirmed: 0 };
  const visaPending = (visa.submitted || 0) + (visa.inReview || 0) + (visa.actionRequired || 0);
  const revenuePoints = useMemo(() => normalizeRevenue(revenueQuery.data), [revenueQuery.data]);
  const bookingRows = useMemo(() => toArray(bookingsRowsQuery.data).map(normalizeBooking), [bookingsRowsQuery.data]);
  const refreshing = [stocksQuery, visaQuery, financeQuery, revenueQuery, bookingsQuery, bookingsRowsQuery, airlinesQuery].some((query) => query.isFetching);

  const refreshAll = async () => {
    await Promise.allSettled([
      stocksQuery.refetch(),
      visaQuery.refetch(),
      financeQuery.refetch(),
      revenueQuery.refetch(),
      bookingsQuery.refetch(),
      bookingsRowsQuery.refetch(),
      airlinesQuery.refetch(),
    ]);
  };

  const metrics = [
    { key: 'departures', label: 'Today\'s departures', value: flights.totalBatches, note: `${flights.availableSeats ?? 0} seats available`, tone: 'good' },
    { key: 'approvals', label: 'Booking approvals', value: (bookings.pending || 0) + (bookings.paymentPending || 0), note: bookings.pending || bookings.paymentPending ? 'Needs review' : 'Queue is clear', tone: bookings.pending || bookings.paymentPending ? 'warn' : 'good', onClick: () => toggleExplorer('bookings') },
    { key: 'visa', label: 'Visa cases', value: visa.totalApplications, note: `${visa.actionRequired || 0} documents need attention`, tone: visa.actionRequired ? 'warn' : 'good' },
    { key: 'hotel', label: 'Hotel availability', value: hotels.availableRooms, note: `${hotelCountQuery.data ?? 0} hotels · ${hotels.totalRooms ?? 0} total rooms`, tone: 'good' },
    { key: 'inventory', label: 'Inventory on hand', value: inventoryCountQuery.data, note: 'Flights · Hotels · Visa · Packages', tone: 'good', onClick: () => toggleExplorer('inventory') },
  ];

  // Snapshot drill-down links for change notifications.
  const metricLinks = {
    departures: '/admin/inventory/flights',
    approvals: '/admin/bookings',
    visa: '/admin/visa/dashboard',
    hotel: '/admin/inventory/hotels',
    inventory: '/admin/inventory/flights',
  };
  // Encode only the values so the watcher effect reruns when a number changes.
  const metricSignature = metrics.map((metric) => `${metric.key}:${Number(metric.value ?? 0)}`).join('|');

  useEffect(() => {
    if (loading) return;
    const { lastValues, setLastValue, pushMetricChange } = useNotificationStore.getState();
    metricSignature.split('|').forEach((entry) => {
      const [key, raw] = entry.split(':');
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      const previous = lastValues[key];
      if (previous != null && Number(previous) !== value) {
        const metric = metrics.find((item) => item.key === key);
        const label = metric ? metric.label : key;
        pushMetricChange(key, label, previous, value, metricLinks[key]);
        toast.info(`${label}: ${previous} → ${value}`);
      }
      setLastValue(key, value);
    });
    // metrics/metricLinks are stable within a signature; only values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricSignature, loading]);

  if (loading) return <LoadingSpinner text="Loading operations dashboard…" />;

  return (
    <div className="dashboard-page animate-slide-in">
      <DashboardContext displayName={displayName} />
      <main className="dashboard-content">
        {allDashboardQueriesFailed ? <DashboardError onRetry={refreshAll} /> : (
          <>
            <DashboardSnapshot
              metrics={metrics}
              updatedAt={new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              refreshing={refreshing}
              onRefresh={refreshAll}
            />
            {explorerMode && (
              <SnapshotExplorer mode={explorerMode} onClose={() => setExplorerMode(null)} />
            )}
            <QuickAccess />
            <TravelPulse
              flights={flights}
              hotels={hotels}
              visaPending={visaPending}
              visaTotal={visa.totalApplications}
              visaActionRequired={visa.actionRequired}
              paymentPending={bookings.paymentPending}
              paymentPendingAmount={finance.pending}
            />
            <OperationsTable
              rows={bookingRows}
              loading={bookingsRowsQuery.isLoading}
              error={bookingsRowsQuery.error}
              onRetry={() => bookingsRowsQuery.refetch()}
              search={operationsSearch}
              onSearchChange={setOperationsSearch}
              status={operationsStatus}
              onStatusChange={setOperationsStatus}
              onCustomPackage={() => navigate('/admin/packages/custom')}
            />
            <div className="dashboard-insights">
              <RevenueInsight points={revenuePoints} />
              <BookingStatusInsight counts={bookings} />
            </div>
          </>
        )}
      </main>
      <span className="sr-only">Current dashboard route: {location.pathname}</span>
    </div>
  );
}
