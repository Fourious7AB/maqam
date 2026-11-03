import { AlertCircle, ChevronDown, ListFilter, Plus, RefreshCw, Search, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import { STATUS_OPTIONS, formatDate, formatCount, getInitials, getStatusLabel, getStatusTone } from '../dashboardData';

function StatusPill({ status }) {
  return <span className={`dashboard-status dashboard-status-${getStatusTone(status)}`}><span aria-hidden="true" />{getStatusLabel(status)}</span>;
}

function LoadingRows() {
  return <div className="dashboard-table-state" aria-label="Loading today&apos;s operations" role="status">
    {Array.from({ length: 5 }, (_, index) => <div key={index} className="dashboard-skeleton-row"><span /><span /><span /><span /></div>)}
  </div>;
}

export default function OperationsTable({ rows, loading, error, onRetry, search, onSearchChange, status, onStatusChange, onCustomPackage }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !query || `${row.bookingNumber} ${row.traveler} ${row.packageName}`.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || row.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [rows, search, status]);

  return (
    <section className="dashboard-card dashboard-table-card" aria-labelledby="operations-title">
      <div className="dashboard-section-head dashboard-table-head">
        <div>
          <h2 id="operations-title">Today&apos;s operations</h2>
          <p>Recent bookings and the next action for each traveler journey.</p>
        </div>
        <div className="dashboard-table-actions">
          <label className="dashboard-table-search">
            <Search size={14} aria-hidden="true" />
            <span className="sr-only">Search today&apos;s operations</span>
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search bookings…" />
          </label>
          <div className="dashboard-filter-wrap">
            <button
              type="button"
              className={`dashboard-action-button dashboard-action-quiet ${status !== 'all' ? 'is-active' : ''}`}
              aria-expanded={filtersOpen}
              aria-haspopup="menu"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <ListFilter size={14} aria-hidden="true" />
              Filters
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {filtersOpen && (
              <div className="dashboard-filter-menu" role="menu" aria-label="Filter today's operations">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={status === option.value}
                    className={status === option.value ? 'is-selected' : ''}
                    onClick={() => { onStatusChange(option.value); setFiltersOpen(false); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="button" onClick={onCustomPackage} className="dashboard-action-primary"><Plus size={14} aria-hidden="true" />Custom Package</Button>
        </div>
      </div>

      {loading ? <LoadingRows /> : error ? (
        <div className="dashboard-table-state dashboard-state-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <strong>Unable to load today&apos;s operations.</strong>
          <p>{error.message || 'Please try again.'}</p>
          <Button type="button" variant="secondary" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />Retry</Button>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="dashboard-table-state">
          <Search size={18} aria-hidden="true" />
          <strong>No operations found</strong>
          <p>Try a different search or clear the status filter.</p>
        </div>
      ) : (
        <div className="dashboard-table-scroll">
          <table className="dashboard-operations-table">
            <thead>
              <tr>
                <th>Booking</th><th>Traveler</th><th>Package</th><th>Departure</th><th>Status</th><th>Owner</th><th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td data-label="Booking">
                    <div className="dashboard-booking">
                      <span className={`dashboard-booking-mark dashboard-booking-mark-${index % 4}`}>BK</span>
                      <div><strong>{row.bookingNumber}</strong><small>{row.travelers ? `${formatCount(row.travelers)} travelers` : 'Traveler details'}{row.source ? ` · ${row.source}` : ''}</small></div>
                    </div>
                  </td>
                  <td data-label="Traveler"><strong>{row.traveler}</strong></td>
                  <td data-label="Package"><span>{row.packageName}</span></td>
                  <td data-label="Departure"><span className="dashboard-date">{formatDate(row.departure)}</span></td>
                  <td data-label="Status"><StatusPill status={row.status} /></td>
                  <td data-label="Owner"><span className="dashboard-owner"><span className="dashboard-owner-avatar">{getInitials(row.owner)}</span>{row.owner}</span></td>
                  <td data-label="Next action"><Link className="dashboard-row-action" to={row.nextActionTo}>{row.nextAction}<ArrowUpRight size={13} aria-hidden="true" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
