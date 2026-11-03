import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { bookingsApi } from '../../bookings/bookingsApi';
import { packagesApi } from '../../packages/packagesApi';
import { stocksApi } from '../../inventory/stocks/stocksApi';
import { visaApi } from '../../inventory/visa/visaApi';
import {
  countOf,
  formatCount,
  formatCurrency,
  getStatusLabel,
  getStatusTone,
  normalizeBookingCard,
  normalizeFlightStock,
  normalizeHotelStock,
  normalizePackageCard,
  normalizeVisaInventory,
  toArray,
} from '../dashboardData';

const INVENTORY_CATEGORIES = [
  { value: 'flights', label: 'Flights' },
  { value: 'hotels', label: 'Hotels' },
  { value: 'visa', label: 'Visa' },
  { value: 'packages', label: 'Packages' },
  { value: 'cars', label: 'Cars' },
  { value: 'insurance', label: 'Insurance' },
];

const PAGE_SIZE = 8;

const inventoryFetchers = {
  flights: async () => {
    const { stocks, pagination } = await stocksApi.listFlights({ page: 1, limit: PAGE_SIZE });
    return { rows: stocks.map(normalizeFlightStock), total: pagination?.total ?? stocks.length };
  },
  hotels: async () => {
    const { stocks, pagination } = await stocksApi.listHotels({ page: 1, limit: PAGE_SIZE });
    return { rows: stocks.map(normalizeHotelStock), total: pagination?.total ?? stocks.length };
  },
  visa: async () => {
    const { data, meta } = await visaApi.listInventory({ page: 1, limit: PAGE_SIZE });
    const rows = toArray(data).map(normalizeVisaInventory);
    return { rows, total: Number(meta?.total ?? rows.length) };
  },
  packages: async () => {
    const result = await packagesApi.list({ page: 1, pageSize: PAGE_SIZE });
    const rows = toArray(result).map(normalizePackageCard);
    return { rows, total: countOf(result) || rows.length };
  },
  // Cars and insurance have no backend endpoints yet; keep them selectable so
  // the dropdown matches the operations catalogue, with a clear empty state.
  cars: async () => ({ rows: [], total: 0, unavailable: true, to: '/admin/inventory/cars' }),
  insurance: async () => ({ rows: [], total: 0, unavailable: true, to: '/admin/inventory/insurance' }),
};

function useExplorerData({ mode, category }) {
  return useQuery({
    queryKey: ['dashboard', 'explorer', mode, mode === 'inventory' ? category : 'all'],
    queryFn: async () => {
      if (mode === 'bookings') {
        const result = await bookingsApi.list({ page: 1, limit: PAGE_SIZE });
        return { rows: toArray(result).map(normalizeBookingCard), total: countOf(result) };
      }
      return inventoryFetchers[category]();
    },
    enabled: Boolean(mode),
  });
}

function StatusChip({ status }) {
  return (
    <span className={`dashboard-status dashboard-status-${getStatusTone(status)}`}>
      <span aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

function ExplorerCard({ item, onEdit }) {
  const navigate = useNavigate();
  const open = () => navigate(item.to);

  return (
    <article
      className="dashboard-item-card"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
    >
      <div className="dashboard-item-main">
        <p className="dashboard-item-title">{item.title}</p>
        <p className="dashboard-item-subtitle">{item.subtitle}</p>
      </div>
      <div className="dashboard-item-side">
        {item.price != null && item.price !== ''
          ? <p className="dashboard-item-price">{formatCurrency(item.price)}</p>
          : null}
        {item.status ? <StatusChip status={item.status} /> : null}
      </div>
      {item.details.length > 0 && (
        <div className="dashboard-item-details">
          {item.details.map((detail) => <span key={detail}>{detail}</span>)}
        </div>
      )}
      <div className="dashboard-item-actions">
        <button
          type="button"
          className="dashboard-item-button is-view"
          onClick={(event) => { event.stopPropagation(); open(); }}
        >
          <ExternalLink size={13} aria-hidden="true" />
          View
        </button>
        <button
          type="button"
          className="dashboard-item-button is-edit"
          onClick={(event) => { event.stopPropagation(); onEdit(item); }}
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
      </div>
    </article>
  );
}

function ExplorerEmpty({ text, to }) {
  const navigate = useNavigate();
  return (
    <div className="dashboard-explorer-empty">
      <p>{text}</p>
      {to && (
        <button type="button" className="dashboard-item-button is-view" onClick={() => navigate(to)}>
          <ExternalLink size={13} aria-hidden="true" />
          Open section
        </button>
      )}
    </div>
  );
}

export default function SnapshotExplorer({ mode, onClose }) {
  const [category, setCategory] = useState('flights');
  const navigate = useNavigate();
  const { data, isLoading, isError } = useExplorerData({ mode, category });

  if (!mode) return null;

  const isInventory = mode === 'inventory';
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <section className="dashboard-card dashboard-explorer" aria-labelledby="explorer-title">
      <div className="dashboard-explorer-head">
        <div>
          <p className="dashboard-eyebrow">Snapshot drill-down</p>
          <h2 id="explorer-title">{isInventory ? 'Inventory explorer' : 'Booking requests'}</h2>
        </div>
        <div className="dashboard-explorer-tools">
          {isInventory && (
            <label className="dashboard-explorer-select">
              <span className="sr-only">Inventory category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {INVENTORY_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="dashboard-explorer-close" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>
      </div>

      <p className="dashboard-explorer-meta">
        {isLoading
          ? 'Loading records…'
          : `${formatCount(total)} total ${isInventory ? `${category} records` : 'booking requests'} · showing ${rows.length}`}
      </p>

      {isLoading ? (
        <div className="dashboard-explorer-grid" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="dashboard-item-skeleton" />)}
        </div>
      ) : isError ? (
        <ExplorerEmpty text="Could not load records right now." />
      ) : rows.length === 0 ? (
        data?.unavailable
          ? <ExplorerEmpty text={`${category[0].toUpperCase()}${category.slice(1)} inventory is not connected yet.`} to={data.to} />
          : <ExplorerEmpty text={`No ${isInventory ? category : 'booking'} records found.`} />
      ) : (
        <div className="dashboard-explorer-grid">
          {rows.map((item) => (
            <ExplorerCard
              key={item.id}
              item={item}
              onEdit={(card) => navigate(card.editTo || card.to)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
