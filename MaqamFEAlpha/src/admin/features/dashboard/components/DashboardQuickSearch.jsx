import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react';

import { sidebarSections } from '../../../config/navigation';
import { bookingsApi } from '../../bookings/bookingsApi';
import { formatDate, getStatusLabel, getStatusTone, normalizeBooking, toArray } from '../dashboardData';

const pageEntries = sidebarSections.flatMap((section) => section.items.map((item) => ({
  label: item.label,
  section: section.label,
  to: item.to,
  icon: item.icon,
})));

// Global dashboard search: matches admin pages (navigation config) and
// bookings (server-side `search` param). Results open in a dropdown under
// the header input; Enter/click navigates.
export default function DashboardQuickSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const pages = useMemo(() => {
    const needle = debounced.toLowerCase();
    if (needle.length < 2) return [];
    return pageEntries.filter((entry) => `${entry.section} ${entry.label} ${entry.to}`.toLowerCase().includes(needle)).slice(0, 5);
  }, [debounced]);

  const bookingsQuery = useQuery({
    queryKey: ['dashboard', 'quick-search', debounced],
    queryFn: () => bookingsApi.list({ search: debounced, limit: 5 }),
    enabled: debounced.length >= 2,
  });
  const bookings = useMemo(() => toArray(bookingsQuery.data).map(normalizeBooking), [bookingsQuery.data]);

  const hasQuery = debounced.length >= 2;
  const showPanel = open && hasQuery;
  const searching = bookingsQuery.isFetching;
  const noResults = !searching && pages.length === 0 && bookings.length === 0;

  const go = (to) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <div className="dashboard-context-search dashboard-quicksearch" ref={rootRef}>
      <Search size={17} aria-hidden="true" />
      <span className="sr-only">Search pages, bookings, and travelers</span>
      <input
        type="search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        placeholder="Search pages, bookings, travelers…"
        aria-expanded={showPanel}
        aria-haspopup="listbox"
      />
      {showPanel && (
        <div className="dashboard-quicksearch-panel" role="listbox" aria-label="Search results">
          {pages.length > 0 && <p className="dashboard-quicksearch-group">Pages</p>}
          {pages.map((entry) => (
            <button key={entry.to} type="button" role="option" aria-selected={false} className="dashboard-quicksearch-row" onClick={() => go(entry.to)}>
              <span className="dashboard-quicksearch-icon"><entry.icon size={14} aria-hidden="true" /></span>
              <span className="dashboard-quicksearch-main">
                <span className="dashboard-quicksearch-title">{entry.label}</span>
                <span className="dashboard-quicksearch-sub">{entry.section} section</span>
              </span>
            </button>
          ))}

          {bookings.length > 0 && <p className="dashboard-quicksearch-group">Bookings</p>}
          {bookings.map((booking) => (
            <button key={booking.id} type="button" role="option" aria-selected={false} className="dashboard-quicksearch-row" onClick={() => go(`/admin/bookings/${booking.id}`)}>
              <span className="dashboard-quicksearch-icon"><CalendarDays size={14} aria-hidden="true" /></span>
              <span className="dashboard-quicksearch-main">
                <span className="dashboard-quicksearch-title">{booking.bookingNumber} · {booking.traveler}</span>
                <span className="dashboard-quicksearch-sub">{booking.packageName}{booking.departure ? ` · ${formatDate(booking.departure)}` : ''}</span>
              </span>
              <span className={`dashboard-status dashboard-status-${getStatusTone(booking.status)}`}>
                <span aria-hidden="true" />
                {getStatusLabel(booking.status)}
              </span>
            </button>
          ))}

          {searching && <p className="dashboard-quicksearch-empty">Searching bookings…</p>}
          {noResults && <p className="dashboard-quicksearch-empty">No pages or bookings match “{debounced}”.</p>}
        </div>
      )}
    </div>
  );
}
