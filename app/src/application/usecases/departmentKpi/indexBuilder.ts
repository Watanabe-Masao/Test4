/**
 * 部門別KPIのインデックス構築
 *
 * 生の records[] 配列を deptCode でインデックス化し、
 * 集約値（加重平均粗利率、売上合計等）を事前計算する。
 * データインポート時に1回だけ実行される。
 *
 * CLAUDE.md「既知の課題と移行方針」に準拠:
 * - 生データ (DepartmentKpiData) を直接UIに渡さない
 * - フィルタ・集約ロジックをアプリケーション層に集約
 */
import type { DepartmentKpiRecord, DepartmentKpiData } from '@/domain/models'
import {
  safeDivide,
  calculateAchievementRate,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'

/** 部門KPIサマリー（全部門の集約値） */
export interface DepartmentKpiSummary {
  /** 部門数 */
  readonly deptCount: number
  /** 売上予算合計 */
  readonly totalSalesBudget: number
  /** 売上実績合計 */
  readonly totalSalesActual: number
  /** 全体売上達成率（実績合計/予算合計） */
  readonly overallSalesAchievement: number
  /** 売上加重平均粗利率（予算） */
  readonly weightedGpRateBudget: number
  /** 売上加重平均粗利率（実績） */
  readonly weightedGpRateActual: number
  /** 売上加重平均売変率 */
  readonly weightedDiscountRate: number
  /** 売上加重平均値入率 */
  readonly weightedMarkupRate: number
}

/** 部門別KPIインデックス */
export interface DepartmentKpiIndex {
  /** deptCode → レコード の参照マップ */
  readonly byDeptCode: ReadonlyMap<string, DepartmentKpiRecord>
  /** 全レコード（元データと同一の順序） */
  readonly records: readonly DepartmentKpiRecord[]
  /** 全部門の集約サマリー */
  readonly summary: DepartmentKpiSummary
  /** 粗利率実績の降順ランキング（deptCode配列） */
  readonly gpRateRanking: readonly string[]
  /** 売上達成率の降順ランキング（deptCode配列） */
  readonly salesAchievementRanking: readonly string[]
}

/** 空のインデックス */
export const EMPTY_DEPT_KPI_INDEX: DepartmentKpiIndex = {
  byDeptCode: new Map(),
  records: [],
  summary: {
    deptCount: 0,
    totalSalesBudget: 0,
    totalSalesActual: 0,
    overallSalesAchievement: 0,
    weightedGpRateBudget: 0,
    weightedGpRateActual: 0,
    weightedDiscountRate: 0,
    weightedMarkupRate: 0,
  },
  gpRateRanking: [],
  salesAchievementRanking: [],
}

/**
 * DepartmentKpiData からインデックスを構築する。
 */
export function buildDepartmentKpiIndex(data: DepartmentKpiData): DepartmentKpiIndex {
  const { records } = data
  if (records.length === 0) return EMPTY_DEPT_KPI_INDEX

  // deptCode → record マップ
  const byDeptCode = new Map<string, DepartmentKpiRecord>()
  for (const rec of records) {
    byDeptCode.set(rec.deptCode, rec)
  }

  // 集約計算
  let totalSalesBudget = 0
  let totalSalesActual = 0
  let gpBudgetWeightedSum = 0
  let gpActualWeightedSum = 0
  let discountWeightedSum = 0
  let markupWeightedSum = 0

  for (const rec of records) {
    totalSalesBudget += rec.salesBudget
    totalSalesActual += rec.salesActual

    // 売上実績で加重
    gpBudgetWeightedSum += rec.gpRateBudget * rec.salesActual
    gpActualWeightedSum += rec.gpRateActual * rec.salesActual
    discountWeightedSum += rec.discountRate * rec.salesActual
    markupWeightedSum += rec.markupRate * rec.salesActual
  }

  const summary: DepartmentKpiSummary = {
    deptCount: records.length,
    totalSalesBudget,
    totalSalesActual,
    overallSalesAchievement: calculateAchievementRate(totalSalesActual, totalSalesBudget),
    weightedGpRateBudget: calculateGrossProfitRate(gpBudgetWeightedSum, totalSalesActual),
    weightedGpRateActual: calculateGrossProfitRate(gpActualWeightedSum, totalSalesActual),
    weightedDiscountRate: safeDivide(discountWeightedSum, totalSalesActual),
    weightedMarkupRate: safeDivide(markupWeightedSum, totalSalesActual),
  }

  // ランキング（降順）
  const gpRateRanking = [...records]
    .sort((a, b) => b.gpRateActual - a.gpRateActual)
    .map((r) => r.deptCode)

  const salesAchievementRanking = [...records]
    .sort((a, b) => b.salesAchievement - a.salesAchievement)
    .map((r) => r.deptCode)

  return {
    byDeptCode,
    records,
    summary,
    gpRateRanking,
    salesAchievementRanking,
  }
}
