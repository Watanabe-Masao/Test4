/**
 * buildBudgetSimulatorSource — widget context から simulator 用 raw source を抽出
 *
 * reboot plan Phase E の境界層:
 *   `UnifiedWidgetContext` から「simulator が必要とする値」だけを抽出した
 *   plain object (`BudgetSimulatorSource`) を返す pure function。
 *
 * この source が scenario builder の入力契約。widget / view は context を
 * 知らなくなり、tests は source を直接注入できる。
 *
 * @responsibility R:unclassified
 */
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { RenderUnifiedWidgetContext } from '@/presentation/components/widgets'

/**
 * simulator が必要とする取得済みデータの最小集合。
 *
 * - context の特定フィールドへの直接依存を隔離する
 * - mock / fixture で差し替えられるよう、全て plain type で保持
 */
export interface BudgetSimulatorSource {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
  readonly year: number
  readonly month: number
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi | undefined
  readonly comparisonScope: ComparisonScope | null | undefined
  /** full-month 前年売上合計 (ConditionSummary fallback 用)。未取得時は null */
  readonly freePeriodCompTotalSales: number | null
}

/**
 * `RenderUnifiedWidgetContext` から `BudgetSimulatorSource` を抽出する pure selector。
 *
 * context への直接依存はこの関数内のみ。将来 context の shape が変わっても
 * simulator 本体は影響を受けない。
 *
 * ADR-A-004 PR3: dispatch chokepoint で narrow 済の context を受け取る前提。
 */
export function buildBudgetSimulatorSource(ctx: RenderUnifiedWidgetContext): BudgetSimulatorSource {
  return {
    result: ctx.result,
    prevYear: ctx.prevYear,
    year: ctx.year,
    month: ctx.month,
    prevYearMonthlyKpi: ctx.prevYearMonthlyKpi,
    comparisonScope: ctx.comparisonScope,
    freePeriodCompTotalSales:
      ctx.freePeriodLane?.bundle?.fact?.comparisonSummary?.totalSales ?? null,
  }
}
