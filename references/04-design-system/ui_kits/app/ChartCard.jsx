// Chart card — matches the product's "card with header + chart body" anatomy.
// Draws a simple SVG line/bar to stay in visual DNA without pulling in ECharts.

function ChartCard({ title, subtitle, chips, children, height = 180 }) {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        {chips && <div className="chart-chips">{chips}</div>}
      </div>
      <div className="chart-body" style={{ height }}>{children}</div>
    </div>
  )
}

// A series of (x,y) [0..1] points -> scaled svg path
function LineChartMini({ series, currentIndex, onIndex }) {
  const w = 700, h = 170, pad = { t: 12, r: 12, b: 22, l: 36 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const n = series[0].points.length

  const xAt = (i) => pad.l + (i / (n - 1)) * iw
  const yAt = (v) => pad.t + (1 - v) * ih

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block' }}>
      {/* grid */}
      {yTicks.map((t) => (
        <line key={t} x1={pad.l} x2={w - pad.r} y1={yAt(t)} y2={yAt(t)}
          stroke="var(--border)" strokeDasharray="2 3" />
      ))}
      {/* x labels */}
      {series[0].points.map((p, i) => i % 4 === 0 && (
        <text key={i} x={xAt(i)} y={h - 6} fill="var(--fg3)" fontSize="9"
          textAnchor="middle" fontFamily="var(--font-mono)">{p.x}</text>
      ))}
      {/* y labels */}
      {yTicks.map((t) => (
        <text key={t} x={pad.l - 6} y={yAt(t) + 3} fill="var(--fg3)" fontSize="9"
          textAnchor="end" fontFamily="var(--font-mono)">{Math.round(t * 100)}</text>
      ))}
      {/* series */}
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.y)}`).join(' ')
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? '3 3' : '0'} />
            {s.points.map((p, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r={i === currentIndex ? 3.5 : 0}
                fill={s.color} />
            ))}
          </g>
        )
      })}
      {/* hover line */}
      {currentIndex != null && (
        <line x1={xAt(currentIndex)} x2={xAt(currentIndex)}
          y1={pad.t} y2={h - pad.b} stroke="var(--c-primary)" strokeDasharray="2 3" opacity="0.5" />
      )}
      {/* hit area */}
      <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - r.left
          const i = Math.max(0, Math.min(n - 1, Math.round((x / r.width) * (n - 1))))
          onIndex && onIndex(i)
        }}
        onMouseLeave={() => onIndex && onIndex(null)} />
    </svg>
  )
}

function BarChartMini({ bars }) {
  const w = 700, h = 170, pad = { t: 12, r: 12, b: 22, l: 36 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const n = bars.length
  const bw = iw / n * 0.6
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block' }}>
      <line x1={pad.l} x2={w - pad.r} y1={pad.t + ih / 2} y2={pad.t + ih / 2}
        stroke="var(--border)" strokeDasharray="2 3" />
      {bars.map((b, i) => {
        const cx = pad.l + (i + 0.5) * (iw / n)
        const yMid = pad.t + ih / 2
        const yTop = b.value >= 0 ? yMid - (b.value * ih / 2) : yMid
        const height = Math.abs(b.value * ih / 2)
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={yTop} width={bw} height={height}
              fill={b.value >= 0 ? 'var(--c-success-dark)' : 'var(--c-danger-dark)'}
              rx="2" />
            <text x={cx} y={h - 6} fill="var(--fg3)" fontSize="9"
              textAnchor="middle" fontFamily="var(--font-mono)">{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

window.ChartCard = ChartCard
window.LineChartMini = LineChartMini
window.BarChartMini = BarChartMini
