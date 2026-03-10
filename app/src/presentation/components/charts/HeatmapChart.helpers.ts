import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models'
import type { HourDowMatrixRow } from '@/application/hooks/useDuckDBQuery'

// ── Types ──

export type HeatmapMode = 'amount' | 'yoyDiff'

export interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export interface CellData {
  readonly hour: number
  readonly dow: number
  readonly dailyAvg: number
  readonly zScore: number
  readonly isAnomaly: boolean
}

export interface HeatmapData {
  readonly cells: ReadonlyMap<string, CellData>
  readonly maxValue: number
  readonly anomalyCount: number
  readonly peakHour: number
  readonly peakDow: number
  readonly peakValue: number
}

// ── Constants ──

export const HOUR_MIN = 6
export const HOUR_MAX = 22

/** 曜日ラベル (JS Date.getDay(): 0=日, 1=月, ..., 6=土) */
export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 表示順: 月(1)〜日(0) */
export const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export const Z_SCORE_THRESHOLD = 2.0

// ── Helpers ──

export function cellKey(hour: number, dow: number): string {
  return `${hour}-${dow}`
}

/** 行データからヒートマップデータを構築する */
export function buildHeatmapData(rows: readonly HourDowMatrixRow[]): HeatmapData {
  // 日平均値を算出
  const dailyAvgs: { hour: number; dow: number; avg: number }[] = []
  for (const row of rows) {
    if (row.hour < HOUR_MIN || row.hour > HOUR_MAX) continue
    const avg = row.dayCount > 0 ? row.amount / row.dayCount : 0
    dailyAvgs.push({ hour: row.hour, dow: row.dow, avg })
  }

  if (dailyAvgs.length === 0) {
    return {
      cells: new Map(),
      maxValue: 0,
      anomalyCount: 0,
      peakHour: HOUR_MIN,
      peakDow: 1,
      peakValue: 0,
    }
  }

  // Z-score 計算: 全セルの平均・標準偏差を求める
  const values = dailyAvgs.map((d) => d.avg)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)

  const cells = new Map<string, CellData>()
  let maxValue = 0
  let anomalyCount = 0
  let peakHour = HOUR_MIN
  let peakDow = 1
  let peakValue = 0

  for (const { hour, dow, avg } of dailyAvgs) {
    const zScore = stdDev > 0 ? (avg - mean) / stdDev : 0
    const isAnomaly = Math.abs(zScore) >= Z_SCORE_THRESHOLD

    cells.set(cellKey(hour, dow), {
      hour,
      dow,
      dailyAvg: Math.round(avg),
      zScore: Math.round(zScore * 100) / 100,
      isAnomaly,
    })

    if (avg > maxValue) maxValue = avg
    if (isAnomaly) anomalyCount++
    if (avg > peakValue) {
      peakHour = hour
      peakDow = dow
      peakValue = avg
    }
  }

  return {
    cells,
    maxValue: Math.round(maxValue),
    anomalyCount,
    peakHour,
    peakDow,
    peakValue: Math.round(peakValue),
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

/** 0-1 の割合からヒートマップ色を生成 */
export function interpolateColor(ratio: number, bgColor: string, primaryColor: string): string {
  // bgColor / primaryColor は hex 想定
  const parsedBg = hexToRgb(bgColor)
  const parsedPrimary = hexToRgb(primaryColor)
  if (!parsedBg || !parsedPrimary) return bgColor

  const r = Math.round(parsedBg.r + (parsedPrimary.r - parsedBg.r) * ratio)
  const g = Math.round(parsedBg.g + (parsedPrimary.g - parsedBg.g) * ratio)
  const b = Math.round(parsedBg.b + (parsedPrimary.b - parsedBg.b) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

/** 当年・前年のマトリクスから前年比差分率マップを構築 */
export function buildDiffMap(
  currentRows: readonly HourDowMatrixRow[],
  prevRows: readonly HourDowMatrixRow[],
): Map<string, number> {
  const curMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  for (const r of currentRows) {
    if (r.hour < HOUR_MIN || r.hour > HOUR_MAX) continue
    const avg = r.dayCount > 0 ? r.amount / r.dayCount : 0
    curMap.set(cellKey(r.hour, r.dow), avg)
  }
  for (const r of prevRows) {
    if (r.hour < HOUR_MIN || r.hour > HOUR_MAX) continue
    const avg = r.dayCount > 0 ? r.amount / r.dayCount : 0
    prevMap.set(cellKey(r.hour, r.dow), avg)
  }
  const diffMap = new Map<string, number>()
  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  for (const key of allKeys) {
    const cur = curMap.get(key) ?? 0
    const prev = prevMap.get(key) ?? 0
    const ratio = prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0
    diffMap.set(key, ratio)
  }
  return diffMap
}
