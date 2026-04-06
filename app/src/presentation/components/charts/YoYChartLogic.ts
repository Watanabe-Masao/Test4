/**
 * YoYChart — 純粋ロジック層
 *
 * DuckDB の YoyDailyRow[] を受け取り、チャート描画用データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 当年/前年の日別売上を合算・マッチング
 *   - 差分・ウォーターフォールデータ構築
 *   - サマリー集計（合計・成長率）
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { YoyDailyRow } from '@/application/hooks/duckdb'

// ─── Types ──────────────────────────────────────────

export interface YoYChartDataPoint {
  readonly date: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly diff: number
}

export interface WaterfallItem {
  readonly name: string
  readonly value: number
  readonly base: number
  readonly bar: number
  readonly isTotal?: boolean
}

export interface YoYSummary {
  readonly totalCur: number
  readonly totalPrev: number
  readonly totalDiff: number
  /** 成長率（prevが0の場合はnull） */
  readonly growthRate: number | null
}

// ─── Logic ──────────────────────────────────────────

/** YoyDailyRow[] → 日別比較データ */
export function buildYoYChartData(rows: readonly YoyDailyRow[]): YoYChartDataPoint[] {
  const dailyMap = new Map<string, { curSales: number; prevSales: number; hasPrev: boolean }>()

  for (const row of rows) {
    if (!row.curDateKey) continue
    const existing = dailyMap.get(row.curDateKey) ?? {
      curSales: 0,
      prevSales: 0,
      hasPrev: false,
    }
    existing.curSales += row.curSales
    if (row.prevSales != null) {
      existing.prevSales += row.prevSales
      existing.hasPrev = true
    }
    dailyMap.set(row.curDateKey, existing)
  }

  return [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, d]) => ({
      date: dateKey.slice(5),
      curSales: Math.round(d.curSales),
      prevSales: d.hasPrev ? Math.round(d.prevSales) : null,
      diff: Math.round(d.curSales - d.prevSales),
    }))
}

/** 日別比較データ → ウォーターフォール */
export function buildYoYWaterfallData(chartData: readonly YoYChartDataPoint[]): WaterfallItem[] {
  const totalPrev = chartData.reduce((s, d) => s + (d.prevSales ?? 0), 0)
  const totalCur = chartData.reduce((s, d) => s + d.curSales, 0)

  const items: WaterfallItem[] = []

  items.push({
    name: '前年計',
    value: totalPrev,
    base: 0,
    bar: totalPrev,
    isTotal: true,
  })

  let running = totalPrev
  for (const day of chartData) {
    items.push({
      name: day.date,
      value: day.diff,
      base: day.diff >= 0 ? running : running + day.diff,
      bar: Math.abs(day.diff),
    })
    running += day.diff
  }

  items.push({
    name: '当年計',
    value: totalCur,
    base: 0,
    bar: totalCur,
    isTotal: true,
  })

  return items
}

/** サマリー集計 */
export function computeYoYSummary(chartData: readonly YoYChartDataPoint[]): YoYSummary {
  const totalCur = chartData.reduce((s, d) => s + d.curSales, 0)
  const totalPrev = chartData.reduce((s, d) => s + (d.prevSales ?? 0), 0)
  const totalDiff = totalCur - totalPrev
  const growthRate = totalPrev > 0 ? totalDiff / totalPrev : null

  return { totalCur, totalPrev, totalDiff, growthRate }
}
