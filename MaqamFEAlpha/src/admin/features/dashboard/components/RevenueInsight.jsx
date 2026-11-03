import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../dashboardData';

const chartColors = ['#d6a13c', '#d6a13c', '#0f8b82', '#d6a13c', '#0f8b82', '#d6a13c'];

export default function RevenueInsight({ points }) {
  const latest = points[points.length - 1]?.value;
  const previous = points[points.length - 2]?.value;
  const change = previous ? ((latest - previous) / previous) * 100 : null;

  return (
    <section className="dashboard-card dashboard-insight-card" aria-labelledby="revenue-title">
      <div className="dashboard-section-head">
        <div><h2 id="revenue-title">Revenue by month</h2><p>Last 6 months · confirmed bookings</p></div>
        <span className="dashboard-insight-badge">Last 6 months</span>
      </div>
      {points.length === 0 ? (
        <div className="dashboard-chart-empty">No revenue data available yet.</div>
      ) : (
        <div className="dashboard-chart" role="img" aria-label="Revenue by month bar chart">
          <ResponsiveContainer width="100%" height={180} minWidth={0}>
            <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--dashboard-line-soft)" />
              <XAxis dataKey="label" axisLine={{ stroke: 'var(--dashboard-line)' }} tickLine={false} tick={{ fill: 'var(--dashboard-muted)', fontSize: 10, fontWeight: 700 }} />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip cursor={{ fill: 'var(--dashboard-surface-soft)' }} formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: 10, border: '1px solid var(--dashboard-line)', background: 'var(--dashboard-surface)', color: 'var(--dashboard-ink)' }} />
              <Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={36}>
                {points.map((point, index) => <Cell key={`${point.label}-${index}`} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {points.length > 0 && <div className="dashboard-chart-caption"><span><strong>{formatCurrency(latest)}</strong> latest revenue</span><span>{change === null ? 'Trend starts here' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs last month`}</span></div>}
    </section>
  );
}
