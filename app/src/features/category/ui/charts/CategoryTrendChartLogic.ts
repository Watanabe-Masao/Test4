/**
 * CategoryTrendChart — 純粋ロジック層
 *
 * DuckDB の CategoryDailyTrendRow[] を受け取り、カテゴリ別日次推移データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - カテゴリ別合計額ランキング
 *   - 日別×カテゴリのクロス集計
 *   - 除外コードのフィルタリング
 *   - 前年データの当年日付軸へのマッピング
 *   - 金額/点数の切り替え対応
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:unclassified
 */
import type { CategoryDailyTrendRow } from '@/application/hooks/duckdb'
import type { AppTheme } from '@/presentation/theme/theme'
import type { EChartsOption } from '@/presentation/components/charts/EChart'
import {
  yenYAxis,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { toPct } from '@/presentation/components/charts/chartTheme'

// ─── Types ──────────────────────────────────────────

export type TrendMetric = 'amount' | 'quantity'

export interface CategoryTrendDataPoint {
  readonly date: string
  readonly [categoryKey: string]: string | number | null
}

export interface CategoryInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
}

export interface CategoryTrendResult {
  readonly chartData: readonly CategoryTrendDataPoint[]
  readonly categories: readonly CategoryInfo[]
}

// ─── Helpers ────────────────────────────────────────

function pickValue(row: CategoryDailyTrendRow, metric: TrendMetric): number {
  return metric === 'quantity' ? row.quantity : row.amount
}

// ─── Logic ──────────────────────────────────────────

/** CategoryDailyTrendRow[] → カテゴリ別日次チャートデータ */
export function buildCategoryTrendData(
  rows: readonly CategoryDailyTrendRow[],
  excludedCodes: ReadonlySet<string>,
  metric: TrendMetric = 'amount',
): CategoryTrendResult {
  const categoryTotals = new Map<string, { name: string; total: number }>()
  for (const row of rows) {
    const existing = categoryTotals.get(row.code) ?? { name: row.name, total: 0 }
    existing.total += pickValue(row, metric)
    categoryTotals.set(row.code, existing)
  }

  const categories: CategoryInfo[] = [...categoryTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      totalAmount: Math.round(info.total),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const dateMap = new Map<string, Record<string, number>>()
  for (const row of rows) {
    if (excludedCodes.has(row.code)) continue
    const dateKey = row.dateKey.slice(5)
    const existing = dateMap.get(dateKey) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(pickValue(row, metric))
    dateMap.set(dateKey, existing)
  }

  const sortedDates = [...dateMap.keys()].sort()
  const chartData: CategoryTrendDataPoint[] = sortedDates.map((date) => ({
    date,
    ...dateMap.get(date)!,
  }))

  return { chartData, categories }
}

/**
 * 前年データを当年の日付軸にマッピングする。
 *
 * 前年と当年の dateRange を日数で1:1対応させ、
 * 前年の各日を当年の対応する日に割り当てる。
 *
 * @param prevRows 前年の CategoryDailyTrendRow[]
 * @param currentDates 当年チャートの日付配列 (MM-DD 形式)
 * @param currentCategories 当年のカテゴリ（前年データをこのカテゴリに絞る）
 * @param metric 集計対象（amount | quantity）
 */
export function buildPrevYearTrendData(
  prevRows: readonly CategoryDailyTrendRow[],
  currentDates: readonly string[],
  currentCategories: readonly CategoryInfo[],
  metric: TrendMetric = 'amount',
): ReadonlyMap<string, Record<string, number>> {
  if (prevRows.length === 0 || currentDates.length === 0) return new Map()

  // 前年の全日付を収集してソート
  const prevDateKeys = new Set<string>()
  for (const row of prevRows) {
    prevDateKeys.add(row.dateKey)
  }
  const sortedPrevDates = [...prevDateKeys].sort()

  // 前年日付 → 当年表示日付の1:1マッピング（日数順）
  const prevToCurrentDate = new Map<string, string>()
  for (let i = 0; i < sortedPrevDates.length && i < currentDates.length; i++) {
    prevToCurrentDate.set(sortedPrevDates[i], currentDates[i])
  }

  // 当年カテゴリのコードセット
  const categoryCodes = new Set(currentCategories.map((c) => c.code))

  // 前年データを当年日付軸にマッピング
  const result = new Map<string, Record<string, number>>()
  for (const row of prevRows) {
    if (!categoryCodes.has(row.code)) continue
    const currentDate = prevToCurrentDate.get(row.dateKey)
    if (!currentDate) continue
    const existing = result.get(currentDate) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(pickValue(row, metric))
    result.set(currentDate, existing)
  }

  return result
}

// ─── ECharts Option Builder ────────────────────────

/** 前年シリーズ名のサフィックス */
const PREV_YEAR_SUFFIX = '(前年)'

function toCommaNum(val: number): string {
  return val.toLocaleString() + '点'
}

export function buildCategoryTrendOption(
  chartData: readonly { date: string; [k: string]: string | number | null }[],
  categories: readonly CategoryInfo[],
  theme: AppTheme,
  prevYearData?: ReadonlyMap<string, Record<string, number>>,
  isQuantity?: boolean,
  prevYearLabel?: string,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  const colors = theme.chart.series
  const hasPrev = prevYearData != null && prevYearData.size > 0
  const fmtValue = isQuantity ? toCommaNum : toCommaYen

  const curSeries = categories.map((cat, i) => ({
    name: cat.name,
    type: 'line' as const,
    data: chartData.map((d) => (d[cat.code] as number) ?? null),
    lineStyle: { color: colors[i % colors.length], width: i === 0 ? 2.5 : 1.5 },
    itemStyle: { color: colors[i % colors.length] },
    symbolSize: i === 0 ? 6 : 3,
    connectNulls: true,
  }))

  const prevSeries = hasPrev
    ? categories.map((cat, i) => ({
        name: `${cat.name}${PREV_YEAR_SUFFIX}`,
        type: 'line' as const,
        data: dates.map((date) => {
          const dayData = prevYearData.get(date)
          return dayData?.[cat.code] ?? null
        }),
        lineStyle: {
          color: colors[i % colors.length],
          width: 1,
          type: 'dashed' as const,
          opacity: 0.5,
        },
        itemStyle: { color: colors[i % colors.length], opacity: 0.5 },
        symbolSize: 0,
        connectNulls: true,
      }))
    : []

  const prevNameToValue = hasPrev
    ? (dateName: string) => {
        const dayData = prevYearData.get(dateName)
        if (!dayData) return undefined
        const result = new Map<string, number>()
        for (const cat of categories) {
          if (dayData[cat.code] != null) result.set(cat.name, dayData[cat.code])
        }
        return result
      }
    : undefined

  const yAxis = isQuantity
    ? {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text4,
          formatter: (v: number) => v.toLocaleString(),
        },
        splitLine: { lineStyle: { color: theme.colors.border } },
        name: '点数',
        nameTextStyle: { color: theme.colors.text4 },
      }
    : yenYAxis(theme)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; color: string }[]
        if (!Array.isArray(items)) return ''
        const dateName = (items[0] as unknown as { name: string })?.name ?? ''
        const header = `<div style="font-weight:600;margin-bottom:4px">日付: ${dateName}</div>`

        const curItems = items.filter(
          (item) => item.value != null && !item.seriesName.endsWith(PREV_YEAR_SUFFIX),
        )

        const prevMap = prevNameToValue?.(dateName)

        const rows = curItems
          .map((item) => {
            const curVal = item.value ?? 0
            const prevVal = prevMap?.get(item.seriesName)
            const valCell = `<span style="font-weight:600;font-family:monospace">${fmtValue(curVal)}</span>`

            if (prevVal != null && prevVal > 0) {
              const diff = curVal - prevVal
              const ratio = curVal / prevVal
              const diffSign = diff >= 0 ? '+' : ''
              const diffColor = diff >= 0 ? '#10b981' : '#ef4444'
              const ratioStr = toPct(ratio, 1)
              const yoyCell =
                `<span style="font-family:monospace;text-align:right;line-height:1.2;margin-left:8px">` +
                `<span style="color:${diffColor};font-size:10px">${diffSign}${fmtValue(diff)}</span><br/>` +
                `<span style="color:${diffColor};font-size:10px;font-weight:600">${ratioStr}</span>` +
                `</span>`
              return (
                `<div style="display:flex;align-items:center;gap:4px">` +
                `<span style="color:${item.color};flex:1;white-space:nowrap">${item.seriesName}</span>` +
                valCell +
                yoyCell +
                `</div>`
              )
            }

            return (
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="color:${item.color}">${item.seriesName}</span>` +
              valCell +
              `</div>`
            )
          })
          .join('')

        const prevLabelHtml =
          hasPrev && prevYearLabel
            ? `<div style="font-size:10px;color:rgba(128,128,128,0.8);margin-top:2px">前年: ${prevYearLabel}</div>`
            : ''

        return header + rows + prevLabelHtml
      },
    },
    legend: {
      ...standardLegend(theme),
      type: 'scroll',
      selectedMode: true,
    },
    xAxis: categoryXAxis(dates, theme),
    yAxis,
    series: [...curSeries, ...prevSeries],
  }
}

export { PREV_YEAR_SUFFIX }
