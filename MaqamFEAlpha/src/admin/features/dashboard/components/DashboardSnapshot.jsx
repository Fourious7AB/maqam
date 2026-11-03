import { AlertCircle, BedDouble, CalendarClock, Check, ChevronDown, FileWarning, Layers3, PlaneTakeoff, RefreshCw } from 'lucide-react';
import Button from '../../../components/common/Button';
import { formatCount } from '../dashboardData';

const iconMap = {
  departures: PlaneTakeoff,
  approvals: CalendarClock,
  visa: FileWarning,
  hotel: BedDouble,
  inventory: Layers3,
};

function MetricCell({ metric }) {
  const Icon = iconMap[metric.key] || AlertCircle;
  const NoteIcon = metric.tone === 'warn' ? AlertCircle : Check;
  const interactive = typeof metric.onClick === 'function';

  const content = (
    <>
      <div className="dashboard-stat-label">
        <Icon size={14} aria-hidden="true" />
        {metric.label}
        {interactive && <ChevronDown size={12} className="dashboard-stat-caret" aria-hidden="true" />}
      </div>
      <div className="dashboard-stat-value">{formatCount(metric.value)}</div>
      <div className={`dashboard-stat-note ${metric.tone === 'warn' ? 'is-warn' : 'is-good'}`}>
        <NoteIcon size={12} aria-hidden="true" />
        <span>{metric.note}</span>
      </div>
    </>
  );

  if (!interactive) return <div className="dashboard-stat">{content}</div>;

  return (
    <button type="button" className="dashboard-stat dashboard-stat-button" onClick={metric.onClick}>
      {content}
    </button>
  );
}

export default function DashboardSnapshot({ metrics, updatedAt, refreshing, onRefresh }) {
  return (
    <section className="dashboard-card dashboard-summary" aria-labelledby="snapshot-title">
      <div className="dashboard-summary-intro">
        <p className="dashboard-eyebrow">Operations snapshot</p>
        <h2 id="snapshot-title">Today&apos;s control room</h2>
        <p>Updated {updatedAt} · All regions</p>
      </div>
      {metrics.map((metric) => <MetricCell key={metric.key} metric={metric} />)}
      <Button
        type="button"
        variant="secondary"
        loading={refreshing}
        onClick={onRefresh}
        className="dashboard-refresh"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Refresh data
      </Button>
    </section>
  );
}
