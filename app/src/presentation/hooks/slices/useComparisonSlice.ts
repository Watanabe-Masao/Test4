/**
 * useComparisonSlice — 比較期間・モード slice
 *
 * comparison scope / prevYear / dowGap / kpi を統合して返す。
 * useUnifiedWidgetContext の context slice として比較関連の依存を局所化する。
 *
 * ## unify-period-analysis Phase 1 — 入口の frame 化
 *
 * 本 slice は `FreePeriodAnalysisFrame` を primary 入力として受け取る形に
 * 書き換えられた。frame.comparison は事前構築された `ComparisonScope | null`
 * であり、slice は以後この値を「comparison 有効判定の唯一の入口」として扱う。
 *
 * ## unify-period-analysis Phase 6a — frame.comparison の pass-through
 *
 * Phase 6a で `useComparisonModule` に `externalScope` パラメータが追加された
 * ため、本 slice は `frame.comparison` をそのまま externalScope として渡す。
 * これで scope の二重構築 (frame 構築経路 + comparison module 内部の scope
 * factory 呼び出し) が解消された。等価性は `frameComparisonParity` test で
 * 固定済み。
 *
 * 内部 comparison module の残る periodSelection 依存 (kpi projection の
 * period1/period2 / dowGap の year/month) は Phase 6b で除去予定。
 *
 * @responsibility R:context
 */
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import { useComparisonModule } from '@/application/hooks/useComparisonModule'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { PrevYearScope } from '@/domain/models/ComparisonScope'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'

export interface ComparisonSlice {
  readonly daily: PrevYearData
  readonly kpi: PrevYearMonthlyKpi
  readonly scope: ComparisonScope | null
  readonly dowGap: DowGapAnalysis
  readonly prevYearScope: PrevYearScope | undefined
}

export function useComparisonSlice(
  frame: FreePeriodAnalysisFrame,
  periodSelection: PeriodSelection,
  elapsedDays: number | undefined,
  averageDailySales: number,
): ComparisonSlice {
  // Phase 6a: frame.comparison を externalScope として渡すことで、
  // comparison module 内部の scope 再構築を skip する。
  // periodSelection は kpi projection / dowGap で必要なため Phase 6a 時点では
  // まだ渡す (Phase 6b で除去予定)。
  const comparison = useComparisonModule(
    periodSelection,
    elapsedDays,
    averageDailySales,
    frame.comparison,
  )
  return comparison
}
