/**
 * BudgetVsActualChart ViewModel
 *
 * 予算進捗率・着地予想・前年累積マップ・チャートデータ拡張の計算ロジック。
 * React 非依存。副作用なし。
 *
 * @guard F7 View は ViewModel のみ受け取る
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:transform
 */
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { DataPoint } from './BudgetVsActualChart.builders'

// ── 型定義 ──

export interface BudgetProgressResult {
  readonly currentActual: number
  readonly currentBudgetCum: number
  readonly currentDay: number
  readonly progressRate: number
  readonly projected: number
  readonly projectedAchievement: number
}

export type StatusColor = 'success' | 'warning' | 'danger'

export interface EnrichedDataPoint extends DataPoint {
  readonly diff: number | null
  readonly achieveRate: number | null
  readonly budgetDiff: number | null
  readonly prevYearDiff: number | null
}

// ── 計算ロジック ──

/**
 * 予算進捗率・着地予想を計算する。
 *
 * @responsibility R:transform
 */
export function computeBudgetProgress(
  data: readonly DataPoint[],
  budget: number,
  salesDays: number | undefined,
  daysInMonth: number | undefined,
): BudgetProgressResult {
  const latestWithSales = [...data].reverse().find((d) => d.actualCum > 0)
  const currentActual = latestWithSales?.actualCum ?? 0
  const currentBudgetCum = latestWithSales?.budgetCum ?? 0
  const currentDay = latestWithSales?.day ?? 0

  const progressRate = currentBudgetCum > 0 ? currentActual / currentBudgetCum : 0
  const totalDays = daysInMonth ?? data.length
  const effectiveSalesDays = salesDays ?? currentDay
  const avgDaily = effectiveSalesDays > 0 ? currentActual / effectiveSalesDays : 0
  const remainingDays = totalDays - currentDay
  const projected = currentActual + avgDaily * remainingDays
  const projectedAchievement = budget > 0 ? projected / budget : 0

  return {
    currentActual,
    currentBudgetCum,
    currentDay,
    progressRate,
    projected,
    projectedAchievement,
  }
}

/**
 * 進捗率に基づくステータス色を返す。
 * >=100% 緑, >=90% 黄, <90% 赤
 *
 * @responsibility R:transform
 */
export function getProgressStatusColor(rate: number): StatusColor {
  if (rate >= 1.0) return 'success'
  if (rate >= 0.9) return 'warning'
  return 'danger'
}

/**
 * 前年累積マップを構築する（prevYearDiff ビュー用）。
 *
 * @responsibility R:transform
 */
export function buildPrevYearCumMap(
  prevYearDaily: ReadonlyMap<string, { sales: number }> | undefined,
  daysInMonth: number,
  year: number,
  month: number,
): ReadonlyMap<number, number> {
  const map = new Map<number, number>()
  if (!prevYearDaily) return map
  let pCum = 0
  for (let d = 1; d <= daysInMonth; d++) {
    pCum += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
    map.set(d, pCum)
  }
  return map
}

/**
 * 差分・達成率を含む拡張データを構築する。
 *
 * @responsibility R:transform
 */
export function enrichChartData(
  data: readonly DataPoint[],
  prevYearCumMap: ReadonlyMap<number, number>,
  hasPrevYearDiff: boolean,
  rangeStart: number,
  rangeEnd: number,
): readonly EnrichedDataPoint[] {
  return [...data]
    .map((d) => ({
      ...d,
      diff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
      achieveRate: d.budgetCum > 0 && d.actualCum > 0 ? (d.actualCum / d.budgetCum) * 100 : null,
      budgetDiff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
      prevYearDiff:
        hasPrevYearDiff && d.actualCum > 0 ? d.actualCum - (prevYearCumMap.get(d.day) ?? 0) : null,
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
}

/**
 * 前年比較のサマリー指標を計算する。
 *
 * @responsibility R:transform
 */
export function computePrevYearComparison(
  currentActual: number,
  latestPrevYearCum: number | null,
): { diffAmt: number | null; growth: number | null } {
  if (latestPrevYearCum == null) return { diffAmt: null, growth: null }
  const diffAmt = currentActual - latestPrevYearCum
  const growth =
    latestPrevYearCum > 0 ? ((currentActual - latestPrevYearCum) / latestPrevYearCum) * 100 : null
  return { diffAmt, growth }
}
