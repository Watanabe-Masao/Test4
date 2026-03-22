/**
 * 部門別KPIインデックスの型定義
 *
 * presentation 層が application/usecases/ の実装に依存せず、
 * domain/ の型として参照できるようにする（@guard A4）。
 */
import type { DepartmentKpiRecord } from './record'

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
