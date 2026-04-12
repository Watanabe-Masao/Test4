/**
 * 日別詳細のグラフビュー + 曜日ラベルヘルパー
 */
import type {
  DailyDetailRow,
  DailyYoYRow,
  DailyDiscountRateYoYRow,
  DailyMarkupRateYoYRow,
} from './ConditionSummaryEnhanced.vm'
import type { MetricKey } from './conditionSummaryTypes'
import { formatPercent100, dayLabel } from './conditionSummaryFormatters'

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

// ─── Rate Chart (gpRate, markupRate, discountRate) ────

/**
 * 率メトリクス用の日別推移チャート。
 *
 * - 日別実績率 (折れ線)
 * - 累計平均率 (太線)
 * - 予算ライン (gpRate/markupRate のみ、水平破線)
 * - 前年比モード: 当年累計 vs 前年累計
 */
export function DailyRateChart({
  rows,
  metric,
  year,
  month,
  budgetRate,
  showYoY,
  discountRateYoYRows,
  markupRateYoYRows,
}: {
  readonly rows: readonly DailyDetailRow[]
  readonly metric: MetricKey
  readonly year: number
  readonly month: number
  /** 予算率 (×100済、gpRate/markupRate 用) */
  readonly budgetRate: number | undefined
  readonly showYoY: boolean
  readonly discountRateYoYRows: readonly DailyDiscountRateYoYRow[]
  readonly markupRateYoYRows: readonly DailyMarkupRateYoYRow[]
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

  // 率メトリクス: cumActual は累計原量から再計算済みの率なのでそのまま使用
  const cumAvgRates = rows.map((r) => (r.day > 0 ? r.cumActual : 0))

  // 前年比データ
  const hasPrevData =
    showYoY &&
    ((metric === 'discountRate' && discountRateYoYRows.length > 0) ||
      (metric === 'markupRate' && markupRateYoYRows.length > 0))
  const prevCumRates: number[] = hasPrevData
    ? metric === 'discountRate'
      ? discountRateYoYRows.map((r) => r.cumPrevRate)
      : markupRateYoYRows.map((r) => r.cumPrevRate)
    : []

  // Y軸範囲を算出
  const allValues = [
    ...rows.map((r) => r.actual),
    ...cumAvgRates,
    ...(budgetRate != null ? [budgetRate] : []),
    ...prevCumRates,
  ].filter((v) => v > 0)
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 1
  const margin = Math.max((rawMax - rawMin) * 0.15, 0.5)
  const yMin = Math.max(0, rawMin - margin)
  const yMax = rawMax + margin

  const xScale = (i: number) => PL + (i / (rows.length - 1 || 1)) * chartW
  const yScale = (v: number) => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH

  // 日別実績 (薄い線)
  const dailyPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(r.actual)}`)
    .join('')

  // 累計平均 (太い線)
  const cumAvgPath = cumAvgRates
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`)
    .join('')

  // 前年累計
  const prevPath =
    hasPrevData && prevCumRates.length > 0
      ? prevCumRates.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`).join('')
      : ''

  // Y軸目盛り（5段階）
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => yMin + (yMax - yMin) * r)

  const metricColor =
    metric === 'gpRate' ? '#06b6d4' : metric === 'markupRate' ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
        {/* Y gridlines & labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PL}
              x2={W - PR}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text x={PL - 4} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {formatPercent100(v)}
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
        {/* Budget reference line */}
        {budgetRate != null && (
          <line
            x1={PL}
            x2={W - PR}
            y1={yScale(budgetRate)}
            y2={yScale(budgetRate)}
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}
        {/* Daily actual (thin, transparent) */}
        <path d={dailyPath} fill="none" stroke={metricColor} strokeWidth={1} opacity={0.35} />
        {/* Cumulative average (main line) */}
        <path d={cumAvgPath} fill="none" stroke={metricColor} strokeWidth={2.5} />
        {/* Prev year cumulative */}
        {prevPath && (
          <path d={prevPath} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="6 3" />
        )}
        {/* Last point marker */}
        {rows.length > 0 && (
          <circle
            cx={xScale(rows.length - 1)}
            cy={yScale(cumAvgRates[cumAvgRates.length - 1])}
            r={4}
            fill={metricColor}
          />
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
          <span style={{ color: metricColor, opacity: 0.4 }}>━</span> 日別実績
        </span>
        <span>
          <span style={{ color: metricColor }}>━</span> 累計平均
        </span>
        {budgetRate != null && (
          <span>
            <span style={{ color: '#9ca3af' }}>╌</span> 予算
          </span>
        )}
        {prevPath && (
          <span>
            <span style={{ color: '#9ca3af' }}>╌</span> 前年累計
          </span>
        )}
      </div>
    </div>
  )
}
