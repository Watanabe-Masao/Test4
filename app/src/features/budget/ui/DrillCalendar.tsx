/**
 * DrillCalendar — 日別カレンダー表示 (読み取り専用)
 *
 * プロトタイプ App.jsx L869-1024 の DrillCalendar 相当。
 * 7 曜日列 + 合計列 + 日平均行 + 曜日平均行で構成される grid。
 *
 * - 各日セル: 日数・曜日ラベル・達成バー・金額・前年比
 * - 週合計列: 週ごとの合計
 * - 曜日平均行: 曜日ごとの平均 + 前年比
 * - 全体平均 (合計+日平均): 右下セル
 *
 * @responsibility R:widget
 */
import { Fragment, memo, useMemo } from 'react'
import { dowOf, type SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DrillBarFill,
  DrillBarTrack,
  DrillCalendarGrid,
  DrillCell,
  DrillCellAmt,
  DrillCellHead,
  DrillCellOOR,
  DrillCellYoY,
  DrillDowHead,
} from './BudgetSimulatorWidget.styles'

type Fmt = UnifiedWidgetContext['fmtCurrency']

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

interface Props {
  readonly scenario: SimulatorScenario
  /** 表示する値の配列 (0-indexed、length = daysInMonth)。通常 actualDaily / dailyBudget / lyDaily */
  readonly data: readonly number[]
  /** 比較用の配列 (通常 lyDaily or dailyBudget)。null なら比較非表示 */
  readonly compare?: readonly number[] | null
  /** 比較ラベル (「前年」「予算」等) */
  readonly compareLabel?: string
  /** データが有効な範囲 [startDay, endDay] — 1-based、この範囲外のセルは「期間外」表示 */
  readonly rangeStart?: number
  readonly rangeEnd?: number
  /** 週始まり曜日 (0=日 / 1=月)。省略時は 1 */
  readonly weekStart?: 0 | 1
  readonly fmtCurrency: Fmt
  readonly title?: string
  /** 日セルをクリックした時の callback (省略でクリック不可) */
  readonly onDayClick?: (day: number) => void
  /** 日別天気絵文字 (当年 / 前年 の day→icon)。省略で天気表示なし */
  readonly weatherIcons?: import('../application/buildWeatherIconMaps').WeatherIconMaps
}

export const DrillCalendar = memo(function DrillCalendar({
  scenario,
  data,
  compare,
  compareLabel = '前年',
  rangeStart = 1,
  rangeEnd,
  weekStart = 1,
  fmtCurrency,
  title,
  onDayClick,
  weatherIcons,
}: Props) {
  const { year, month, daysInMonth } = scenario
  const rStart = Math.max(1, rangeStart)
  const rEnd = Math.min(daysInMonth, rangeEnd ?? daysInMonth)

  const layout = useMemo(() => {
    // leading padding: 月初の曜日から weekStart までの空セル数
    const firstDow = dowOf(year, month, 1)
    const leadingEmpty = (firstDow - weekStart + 7) % 7

    const cells: Array<number | null> = []
    for (let i = 0; i < leadingEmpty; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)

    const rows: Array<Array<number | null>> = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return { rows, leadingEmpty }
  }, [year, month, daysInMonth, weekStart])

  // ヘッダー曜日 (weekStart 基準)
  const dowHeaders = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)

  const maxDaily = Math.max(...data.slice(rStart - 1, rEnd).filter((v) => Number.isFinite(v)), 1)

  // 週合計
  const weekTotals = useMemo(() => {
    return layout.rows.map((row) => {
      let total = 0
      let cmpTotal = 0
      for (const day of row) {
        if (day == null) continue
        if (day < rStart || day > rEnd) continue
        total += data[day - 1] ?? 0
        if (compare) cmpTotal += compare[day - 1] ?? 0
      }
      const yoy = cmpTotal > 0 ? (total / cmpTotal) * 100 : null
      return { total, cmpTotal, yoy }
    })
  }, [layout.rows, data, compare, rStart, rEnd])

  // 曜日別平均 (in-range)
  const dowAvgs = useMemo(() => {
    return Array.from({ length: 7 }, (_, dw) => {
      let total = 0
      let cmpTotal = 0
      let count = 0
      for (let d = rStart; d <= rEnd; d++) {
        if (dowOf(year, month, d) === dw) {
          total += data[d - 1] ?? 0
          if (compare) cmpTotal += compare[d - 1] ?? 0
          count++
        }
      }
      const avg = count > 0 ? total / count : 0
      const cmpAvg = count > 0 ? cmpTotal / count : 0
      const yoy = cmpTotal > 0 ? (total / cmpTotal) * 100 : null
      return { dw, avg, cmpAvg, yoy, count }
    })
  }, [year, month, data, compare, rStart, rEnd])

  // 全体平均 (合計列の日平均)
  const overallAvg = useMemo(() => {
    let total = 0
    let cmpTotal = 0
    let count = 0
    for (let d = rStart; d <= rEnd; d++) {
      total += data[d - 1] ?? 0
      if (compare) cmpTotal += compare[d - 1] ?? 0
      count++
    }
    const avg = count > 0 ? total / count : 0
    const cmpAvg = count > 0 ? cmpTotal / count : 0
    const yoy = cmpTotal > 0 ? (total / cmpTotal) * 100 : null
    return { avg, cmpAvg, yoy }
  }, [data, compare, rStart, rEnd])

  return (
    <div>
      {title && (
        <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      )}
      <DrillCalendarGrid>
        {/* ヘッダー行: 7 曜日 + 合計 */}
        {dowHeaders.map((dw) => (
          <DrillDowHead key={`h-${dw}`} $sun={dw === 0} $sat={dw === 6}>
            {DOW_JP[dw]}
          </DrillDowHead>
        ))}
        <DrillDowHead>合計</DrillDowHead>

        {/* 日セル + 週合計列 */}
        {layout.rows.map((row, ri) => (
          <Fragment key={`r-${ri}`}>
            {row.map((day, ci) => {
              if (day == null) {
                return <DrillCell key={`c-${ri}-${ci}`} $empty />
              }
              const dw = dowOf(year, month, day)
              const isWE = dw === 0 || dw === 6
              const outOfRange = day < rStart || day > rEnd
              const val = data[day - 1] ?? 0
              const cmp = compare ? (compare[day - 1] ?? 0) : 0
              const yoy = cmp > 0 ? (val / cmp) * 100 : null
              const diff = val - cmp
              const barPct = val > 0 ? (val / maxDaily) * 100 : 0

              const clickable = onDayClick != null && !outOfRange
              const curWeather = weatherIcons?.current.get(day)
              const prevWeather = weatherIcons?.prevYear.get(day)
              return (
                <DrillCell
                  key={`c-${ri}-${ci}`}
                  $weekend={isWE}
                  $outOfRange={outOfRange}
                  onClick={clickable ? () => onDayClick(day) : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `${day}日の詳細を表示` : undefined}
                  style={clickable ? { cursor: 'pointer' } : undefined}
                >
                  <DrillCellHead>
                    <span className="num">{day}</span>
                    <span className="dwlabel">{DOW_JP[dw]}</span>
                  </DrillCellHead>
                  {!outOfRange ? (
                    <>
                      <DrillBarTrack>
                        <DrillBarFill $pct={barPct} />
                      </DrillBarTrack>
                      {compare && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text2, #64748b)' }}>
                          {prevWeather && (
                            <span aria-hidden style={{ marginRight: 2 }}>
                              {prevWeather}
                            </span>
                          )}
                          {compareLabel} ¥{fmtCurrency(cmp)}
                        </div>
                      )}
                      <DrillCellAmt>
                        {curWeather && (
                          <span aria-hidden style={{ marginRight: 2 }}>
                            {curWeather}
                          </span>
                        )}
                        当期 ¥{fmtCurrency(val)}
                      </DrillCellAmt>
                      {yoy != null && (
                        <DrillCellYoY $positive={yoy >= 100}>
                          {compareLabel}比 {yoy.toFixed(0)}% / 差 {diff >= 0 ? '+' : ''}¥
                          {fmtCurrency(diff)}
                        </DrillCellYoY>
                      )}
                    </>
                  ) : (
                    <>
                      <DrillCellAmt style={{ opacity: 0.6 }}>¥{fmtCurrency(val)}</DrillCellAmt>
                      <DrillCellOOR>期間外</DrillCellOOR>
                    </>
                  )}
                </DrillCell>
              )
            })}
            {/* 週合計 */}
            <DrillCell $weekSum key={`w-${ri}`}>
              <DrillCellHead>
                <span className="num">W{ri + 1}</span>
              </DrillCellHead>
              {compare && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text2, #64748b)' }}>
                  {compareLabel} ¥{fmtCurrency(weekTotals[ri].cmpTotal)}
                </div>
              )}
              <DrillCellAmt>当期 ¥{fmtCurrency(weekTotals[ri].total)}</DrillCellAmt>
              {weekTotals[ri].yoy != null && (
                <DrillCellYoY $positive={weekTotals[ri].yoy >= 100}>
                  {weekTotals[ri].yoy.toFixed(0)}% / 差{' '}
                  {weekTotals[ri].total - weekTotals[ri].cmpTotal >= 0 ? '+' : ''}¥
                  {fmtCurrency(weekTotals[ri].total - weekTotals[ri].cmpTotal)}
                </DrillCellYoY>
              )}
            </DrillCell>
          </Fragment>
        ))}

        {/* 曜日平均行 + 日平均セル */}
        {dowHeaders.map((dw) => {
          const a = dowAvgs[dw]
          const isWE = dw === 0 || dw === 6
          const diff = a.avg - a.cmpAvg
          return (
            <DrillCell key={`avg-${dw}`} $avg $weekend={isWE}>
              <DrillCellHead>
                <span className="num">平均</span>
                <span className="dwlabel">{a.count}日</span>
              </DrillCellHead>
              {compare && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text2, #64748b)' }}>
                  {compareLabel} ¥{fmtCurrency(a.cmpAvg)}
                </div>
              )}
              <DrillCellAmt>当期 ¥{fmtCurrency(a.avg)}</DrillCellAmt>
              {a.yoy != null && (
                <DrillCellYoY $positive={a.yoy >= 100}>
                  {a.yoy.toFixed(0)}% / 差 {diff >= 0 ? '+' : ''}¥{fmtCurrency(diff)}
                </DrillCellYoY>
              )}
            </DrillCell>
          )
        })}
        <DrillCell $avg $weekSum>
          <DrillCellHead>
            <span className="num">日平均</span>
          </DrillCellHead>
          {compare && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text2, #64748b)' }}>
              {compareLabel} ¥{fmtCurrency(overallAvg.cmpAvg ?? 0)}
            </div>
          )}
          <DrillCellAmt>当期 ¥{fmtCurrency(overallAvg.avg)}</DrillCellAmt>
          {overallAvg.yoy != null && (
            <DrillCellYoY $positive={overallAvg.yoy >= 100}>
              {overallAvg.yoy.toFixed(0)}% / 差{' '}
              {overallAvg.avg - (overallAvg.cmpAvg ?? 0) >= 0 ? '+' : ''}¥
              {fmtCurrency(overallAvg.avg - (overallAvg.cmpAvg ?? 0))}
            </DrillCellYoY>
          )}
        </DrillCell>
      </DrillCalendarGrid>
    </div>
  )
})
