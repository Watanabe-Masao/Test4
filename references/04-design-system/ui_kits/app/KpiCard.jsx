// KpiCard + trend + formula hint. Accent top-border in category color.

function KpiCard({ label, value, unit, trend, sub, formula, accent, badge }) {
  const up = trend && trend > 0
  const down = trend && trend < 0
  const accentVar = accent ? `var(--c-${accent})` : 'transparent'
  return (
    <div className={`kpi-card${accent ? ' has-accent' : ''}`} style={{ '--accent': accentVar }}>
      <div className="kpi-label">
        <span>{label}</span>
        {badge && <span className={`kpi-badge kpi-badge-${badge.kind}`}>{badge.text}</span>}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value mono">
          {unit === '¥' && <span className="kpi-unit">¥</span>}
          {value}
          {unit && unit !== '¥' && <span className="kpi-unit">{unit}</span>}
        </span>
        {(up || down) && (
          <span className={`kpi-trend ${up ? 'trend-up' : 'trend-down'} mono`}>
            {up ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {formula && <div className="kpi-formula mono">= {formula}</div>}
    </div>
  )
}

window.KpiCard = KpiCard
