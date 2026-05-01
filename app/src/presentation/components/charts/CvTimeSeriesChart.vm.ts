/**
 * CvTimeSeriesChart ViewModel
 *
 * データ変換・ビジネスロジック・フォーマット判定を分離。
 * React / styled-components に依存しない純粋関数群。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import type { CategoryTrendPoint, CategoryBenchmarkTrendRow } from '@/application/hooks/duckdb'
import { palette } from '@/presentation/theme/tokens'

// ── 型定義 ──

export type ViewMode = 'cvLine' | 'salesCv' | 'heatmap'

export const VIEW_LABELS: Record<ViewMode, string> = {
  cvLine: 'CV折れ線',
  salesCv: '売上×CV',
  heatmap: 'CVヒートマップ',
}

export type OverlayMode = 'cv' | 'pi' | 'both'

export const OVERLAY_LABELS: Record<OverlayMode, string> = {
  cv: 'CVのみ',
  pi: 'PIのみ',
  both: 'CV + PI',
}

export type TrendStatus = 'stabilizing' | 'promotion' | 'degrading' | 'stable' | 'unknown'

export interface StatusInfo {
  readonly label: string
  readonly color: string
  readonly description: string
}

export const STATUS_MAP: Record<TrendStatus, StatusInfo> = {
  stabilizing: { label: '定番化', color: palette.successDark, description: 'PI↑ CV↓' },
  promotion: { label: 'プロモーション', color: palette.warningDark, description: 'PI↑ CV↑' },
  degrading: { label: '需要崩れ', color: palette.dangerDark, description: 'PI↓ CV↑' },
  stable: { label: '安定', color: palette.primary, description: 'PI→ CV→' },
  unknown: { label: '不明', color: '#9ca3af', description: 'データ不足' },
}

export interface ChartDataSets {
  readonly cvLineData: readonly Record<string, number | string>[]
  readonly salesCvData: readonly Record<string, number | string>[]
  readonly heatmap: {
    readonly dateKeys: readonly string[]
    readonly cvMap: ReadonlyMap<string, ReadonlyMap<string, number>>
    readonly maxCv: number
  }
  readonly categoryNames: ReadonlyMap<string, string>
  readonly categoryStatuses: ReadonlyMap<string, TrendStatus>
}

// ── 純粋関数 ──

export function detectTrendStatus(points: readonly CategoryTrendPoint[]): TrendStatus {
  if (points.length < 3) return 'unknown'

  const mid = Math.floor(points.length / 2)
  const firstHalf = points.slice(0, mid)
  const secondHalf = points.slice(mid)

  const avgPi1 = firstHalf.reduce((s, p) => s + p.avgShare, 0) / firstHalf.length
  const avgPi2 = secondHalf.reduce((s, p) => s + p.avgShare, 0) / secondHalf.length
  const avgCv1 = firstHalf.reduce((s, p) => s + p.cv, 0) / firstHalf.length
  const avgCv2 = secondHalf.reduce((s, p) => s + p.cv, 0) / secondHalf.length

  const threshold = 0.05

  const piUp = avgPi2 > avgPi1 * (1 + threshold)
  const piDown = avgPi2 < avgPi1 * (1 - threshold)
  const cvUp = avgCv2 > avgCv1 * (1 + threshold)
  const cvDown = avgCv2 < avgCv1 * (1 - threshold)

  if (piUp && cvDown) return 'stabilizing'
  if (piUp && cvUp) return 'promotion'
  if (piDown && cvUp) return 'degrading'
  return 'stable'
}

/** CV値 → ヒートマップ色 (緑=低CV=安定、赤=高CV=不安定)  *
 * @responsibility R:unclassified
 */
export function cvToColor(cv: number, maxCv: number): { bg: string; text: string } {
  const ratio = Math.min(cv / Math.max(maxCv, 0.01), 1)
  if (ratio < 0.25) return { bg: 'rgba(34,197,94,0.25)', text: '#166534' }
  if (ratio < 0.5) return { bg: 'rgba(250,204,21,0.25)', text: '#854d0e' }
  if (ratio < 0.75) return { bg: 'rgba(249,115,22,0.3)', text: '#9a3412' }
  return { bg: 'rgba(239,68,68,0.3)', text: '#991b1b' }
}

// ── データ構築（単一パスで全ビューのデータを構築） ──

export function buildAllChartData(
  trendPoints: readonly CategoryTrendPoint[],
  topCodes: readonly string[],
  salesByDateCode: ReadonlyMap<string, number>,
): ChartDataSets {
  const categoryNames = new Map<string, string>()
  const pointsByCode = new Map<string, CategoryTrendPoint[]>()

  // cvLine + salesCv 用の dateMap（単一パスで同時に構築）
  const dateMap = new Map<
    string,
    { cvLine: Record<string, number | string>; salesCv: Record<string, number | string> }
  >()
  // heatmap 用
  const heatCvMap = new Map<string, Map<string, number>>()
  let maxCv = 0

  for (const p of trendPoints) {
    // カテゴリ名（初回のみ）
    if (!categoryNames.has(p.code)) categoryNames.set(p.code, p.name)

    // pointsByCode（状態判定用）
    let codePoints = pointsByCode.get(p.code)
    if (!codePoints) {
      codePoints = []
      pointsByCode.set(p.code, codePoints)
    }
    codePoints.push(p)

    // dateMap（cvLine + salesCv を同時に構築）
    let entry = dateMap.get(p.dateKey)
    if (!entry) {
      entry = { cvLine: { dateKey: p.dateKey }, salesCv: { dateKey: p.dateKey } }
      dateMap.set(p.dateKey, entry)
    }
    entry.cvLine[`cv_${p.code}`] = p.cv
    entry.cvLine[`pi_${p.code}`] = p.avgShare
    entry.salesCv[`cv_${p.code}`] = p.cv
    entry.salesCv[`sales_${p.code}`] = salesByDateCode.get(`${p.dateKey}|${p.code}`) ?? 0

    // heatmap
    let codeMap = heatCvMap.get(p.code)
    if (!codeMap) {
      codeMap = new Map()
      heatCvMap.set(p.code, codeMap)
    }
    codeMap.set(p.dateKey, p.cv)
    if (p.cv > maxCv) maxCv = p.cv
  }

  const sortByDate = (a: Record<string, number | string>, b: Record<string, number | string>) =>
    (a.dateKey as string).localeCompare(b.dateKey as string)

  // 状態判定
  const categoryStatuses = new Map<string, TrendStatus>()
  for (const code of topCodes) {
    categoryStatuses.set(code, detectTrendStatus(pointsByCode.get(code) ?? []))
  }

  return {
    cvLineData: [...dateMap.values()].map((e) => e.cvLine).sort(sortByDate),
    salesCvData: [...dateMap.values()].map((e) => e.salesCv).sort(sortByDate),
    heatmap: {
      dateKeys: [...new Set(trendPoints.map((p) => p.dateKey))].sort(),
      cvMap: heatCvMap,
      maxCv,
    },
    categoryNames,
    categoryStatuses,
  }
}

export function buildSalesByDateCode(
  trendRows: readonly CategoryBenchmarkTrendRow[],
  topCodes: readonly string[],
): Map<string, number> {
  const topSet = new Set(topCodes)
  const map = new Map<string, number>()
  for (const row of trendRows) {
    if (!topSet.has(row.code)) continue
    const key = `${row.dateKey}|${row.code}`
    map.set(key, (map.get(key) ?? 0) + row.totalSales)
  }
  return map
}

// ── 表示判定ヘルパー ──

export function getOverlayFlags(overlay: OverlayMode): { showCv: boolean; showPi: boolean } {
  return {
    showCv: overlay === 'cv' || overlay === 'both',
    showPi: overlay === 'pi' || overlay === 'both',
  }
}

export function getSubtitleText(viewMode: ViewMode, showPi: boolean): string {
  if (viewMode === 'cvLine') {
    return `カテゴリ別 CV(変動係数)${showPi ? ' + PI値' : ''}の日別推移`
  }
  if (viewMode === 'salesCv') {
    return 'カテゴリ別 売上高 × CV(変動係数)の日別推移'
  }
  return 'カテゴリ × 日付のCV値ヒートマップ'
}
