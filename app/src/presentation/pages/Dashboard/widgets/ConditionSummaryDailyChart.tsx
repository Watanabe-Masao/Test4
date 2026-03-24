/**
 * 日別詳細のグラフビュー + 曜日ラベルヘルパー
 */
import type { DailyDetailRow, DailyYoYRow } from './ConditionSummaryEnhanced.vm'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function dayLabel(day: number, year: number, month: number): string {
  const dow = DOW_LABELS[new Date(year, month - 1, day).getDay()]
  return `${day}(${dow})`
}

export function DailyChart({
  rows,
  fmtCurrency,
  year,
  month,
  showYoY,
  yoyRows,
}: {
  readonly rows: readonly DailyDetailRow[]
  readonly fmtCurrency: (n: number) => string
  readonly year: number
  readonly month: number
  readonly showYoY: boolean
  readonly yoyRows: readonly DailyYoYRow[]
}) {
  if (rows.length === 0) return null

  const W = 800
  const H = 300
  const PL = 70
  const PR = 16
  const PT = 16
  const PB = 40
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const maxBudget = Math.max(...rows.map((r) => r.cumBudget))
  const maxActual = Math.max(...rows.map((r) => r.cumActual))
  const maxPrev =
    showYoY && yoyRows.length > 0 ? Math.max(...yoyRows.map((r) => r.cumPrevActual)) : 0
  const maxVal = Math.max(maxBudget, maxActual, maxPrev) || 1

  const xScale = (i: number) => PL + (i / (rows.length - 1 || 1)) * chartW
  const yScale = (v: number) => PT + chartH - (v / maxVal) * chartH

  const budgetPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(r.cumBudget)}`)
    .join('')
  const actualPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(r.cumActual)}`)
    .join('')
  const prevPath =
    showYoY && yoyRows.length > 0
      ? yoyRows
          .map((r, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(r.cumPrevActual)}`)
          .join('')
      : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r))

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
        {/* Y gridlines & labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PL}
              x2={W - PR}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text x={PL - 4} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {fmtCurrency(v)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {rows
          .filter(
            (_, i) => i % Math.max(1, Math.floor(rows.length / 10)) === 0 || i === rows.length - 1,
          )
          .map((r) => {
            const i = rows.indexOf(r)
            return (
              <text
                key={r.day}
                x={xScale(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {dayLabel(r.day, year, month)}
              </text>
            )
          })}
        {/* Budget line */}
        <path d={budgetPath} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* Actual line */}
        <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {/* Prev year line */}
        {prevPath && (
          <path d={prevPath} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" />
        )}
        {/* Last point markers */}
        {rows.length > 0 && (
          <>
            <circle
              cx={xScale(rows.length - 1)}
              cy={yScale(rows[rows.length - 1].cumActual)}
              r={4}
              fill="#3b82f6"
            />
            <circle
              cx={xScale(rows.length - 1)}
              cy={yScale(rows[rows.length - 1].cumBudget)}
              r={3}
              fill="#9ca3af"
            />
          </>
        )}
      </svg>
      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          fontSize: '0.75rem',
          color: '#6b7280',
        }}
      >
        <span>
          <span style={{ color: '#3b82f6' }}>━</span> 実績累計
        </span>
        <span>
          <span style={{ color: '#9ca3af' }}>╌</span> 予算累計
        </span>
        {showYoY && prevPath && (
          <span>
            <span style={{ color: '#f59e0b' }}>╌</span> 前年累計
          </span>
        )}
      </div>
    </div>
  )
}
