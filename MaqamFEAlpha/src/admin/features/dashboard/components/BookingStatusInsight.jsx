import { CalendarCheck2 } from 'lucide-react';
import { formatCount, getProgress } from '../dashboardData';

const statusRows = [
  { key: 'confirmed', label: 'Confirmed', tone: 'good' },
  { key: 'pending', label: 'Pending review', tone: 'warn' },
  { key: 'cancelled', label: 'Cancelled', tone: 'coral' },
  { key: 'paymentPending', label: 'Payment pending', tone: 'blue' },
];

export default function BookingStatusInsight({ counts }) {
  const total = statusRows.reduce((sum, row) => sum + Number(counts?.[row.key] || 0), 0);

  return (
    <section className="dashboard-card dashboard-insight-card" aria-labelledby="booking-status-title">
      <div className="dashboard-section-head">
        <div><h2 id="booking-status-title">Booking status</h2><p>Current queue · {formatCount(total)} active bookings</p></div>
        <CalendarCheck2 className="dashboard-insight-icon" size={18} aria-hidden="true" />
      </div>
      {total === 0 ? <div className="dashboard-chart-empty">No booking status data available yet.</div> : (
        <div className="dashboard-booking-status">
          {statusRows.map((row) => {
            const value = Number(counts?.[row.key] || 0);
            return <div className="dashboard-status-row" key={row.key}><span>{row.label}</span><div className={`dashboard-status-track dashboard-status-track-${row.tone}`}><span style={{ width: `${getProgress(value, total)}%` }} /></div><strong>{formatCount(value)}</strong></div>;
          })}
        </div>
      )}
    </section>
  );
}
