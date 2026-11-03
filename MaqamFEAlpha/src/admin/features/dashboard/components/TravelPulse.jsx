import { AlertCircle, Clock3, Hotel, MapPin, PlaneTakeoff, WalletCards, ChevronDown, ChevronUp, FileWarning } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import makkahImage from '../../../../assets/makkah.jpg';
import madinahImage from '../../../../assets/hero-slider/slide2-madinah-prophet-mosque.jpg';
import { formatCompactCurrency, formatCount, getProgress } from '../dashboardData';

function PulseImageCard({ image, alt, icon, badge, meta, title, foot, action, to }) {
  const Icon = icon;
  return (
    <article className="dashboard-pulse-item">
      <div className="dashboard-pulse-media">
        <img src={image} alt={alt} loading="lazy" />
        <span className="dashboard-pulse-badge"><Icon size={12} aria-hidden="true" />{badge}</span>
      </div>
      <div className="dashboard-pulse-content">
        <div className="dashboard-pulse-meta"><MapPin size={12} aria-hidden="true" />{meta}</div>
        <h3 className="dashboard-pulse-title">{title}</h3>
        <div className="dashboard-pulse-foot"><span>{foot}</span><Link to={to}>{action}</Link></div>
      </div>
    </article>
  );
}

function PulseQueueCard({ tone = '', icon, count, copy, progress, meta, title, foot, action, to }) {
  const Icon = icon;
  return (
    <article className="dashboard-pulse-item">
      <div className={`dashboard-pulse-plain ${tone}`}>
        <div className="dashboard-pulse-plain-top">
          <span className="dashboard-pulse-icon"><Icon size={16} aria-hidden="true" /></span>
          <strong className="dashboard-pulse-count">{formatCount(count)}</strong>
        </div>
        <div className="dashboard-pulse-copy">{copy}</div>
        <div className="dashboard-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="dashboard-pulse-content">
        <div className="dashboard-pulse-meta"><Clock3 size={12} aria-hidden="true" />{meta}</div>
        <h3 className="dashboard-pulse-title">{title}</h3>
        <div className="dashboard-pulse-foot"><span>{foot}</span><Link to={to}>{action}</Link></div>
      </div>
    </article>
  );
}

export default function TravelPulse({ flights, hotels, visaPending, visaTotal, visaActionRequired, paymentPending, paymentPendingAmount }) {
  const [collapsed, setCollapsed] = useState(false);
  const departureCount = flights?.totalBatches ?? 0;
  const availableSeats = flights?.availableSeats ?? 0;
  const totalRooms = hotels?.totalRooms ?? 0;
  const availableRooms = hotels?.availableRooms ?? 0;
  const visaQueue = visaActionRequired ?? visaPending;

  return (
    <section className="dashboard-card dashboard-pulse" aria-labelledby="pulse-title">
      <div className="dashboard-section-head">
        <div>
          <h2 id="pulse-title">Travel pulse</h2>
          <p>Small signals that need a decision today.</p>
        </div>
        <button
          type="button"
          className="dashboard-collapse"
          aria-expanded={!collapsed}
          aria-controls="travel-pulse-content"
          aria-label={collapsed ? 'Expand travel pulse' : 'Collapse travel pulse'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
        </button>
      </div>

      {!collapsed && (
        <div id="travel-pulse-content" className="dashboard-pulse-grid">
          <PulseImageCard
            image={makkahImage}
            alt="Kaaba in Makkah for today's departures"
            icon={PlaneTakeoff}
            badge={`${formatCount(departureCount)} batches`}
            meta="Makkah · Flight inventory"
            title={departureCount ? 'Makkah departures are ready for review' : 'No Makkah departures are scheduled'}
            foot={`${formatCount(availableSeats)} seats available`}
            action="Open flights"
            to="/admin/inventory/flights"
          />
          <PulseImageCard
            image={madinahImage}
            alt="Green Dome in Madinah for hotel allotment planning"
            icon={Hotel}
            badge={`${formatCount(totalRooms)} rooms held`}
            meta="Madinah · Allotment"
            title={totalRooms ? 'Madinah hotel allotment is being monitored' : 'No hotel allotments are available'}
            foot={`${formatCount(availableRooms)} rooms available`}
            action="Open inventory"
            to="/admin/inventory/hotels"
          />
          <PulseQueueCard
            icon={FileWarning}
            count={visaQueue}
            copy="Visa cases requiring attention before submission."
            progress={getProgress(visaQueue, visaTotal)}
            meta="Case queue · Live visa data"
            title={visaQueue ? 'Documents need a case officer' : 'Visa queue is clear'}
            foot={`${formatCount(visaPending)} pending cases`}
            action="Review cases"
            to="/admin/visa/applications"
          />
          <PulseQueueCard
            tone="amber"
            icon={WalletCards}
            count={paymentPending}
            copy="Payment follow-ups blocking package confirmation."
            progress={getProgress(paymentPending, Math.max(paymentPending, 1))}
            meta="Finance queue · Today"
            title={paymentPending ? 'Payment follow-ups are waiting' : 'No payment follow-ups are waiting'}
            foot={`${formatCompactCurrency(paymentPendingAmount)} pending`}
            action="Open finance"
            to="/admin/finance"
          />
        </div>
      )}

      {collapsed && <p className="dashboard-pulse-collapsed"><AlertCircle size={14} aria-hidden="true" /> Travel pulse is collapsed. Expand to review today&apos;s signals.</p>}
    </section>
  );
}
