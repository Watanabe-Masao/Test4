/**
 * useComparisonSlice — 比較期間・モード slice
 *
 * comparison scope / prevYear / dowGap / kpi を統合して返す。
 * useUnifiedWidgetContext の context slice として比較関連の依存を局所化する。
 *
 * ## phase-6-optional-comparison-projection Phase O6 — core 直接呼び出し
 *
 * Phase O5 で useComparisonModuleCore が PeriodSelection 非依存の core hook
 * として確立された。本 slice は wrapper を経由せず core を直接呼ぶ形に移行。
 * frame.comparison (scope) + buildComparisonProjectionContext(periodSelection)
 * (projectionContext) を core に直接渡す。
 *
 * periodSelection は projectionContext 構築にのみ使用し、core hook には
 * 渡らない。これにより features/comparison/ 内部は PeriodSelection を
 * 完全に知らない状態が維持される。
 *
 * @responsibility R:unclassified
 */
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import { useComparisonModuleCore, buildComparisonProjectionContext } from '@/features/comparison'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { PrevYearScope } from '@/domain/models/ComparisonScope'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import { useMemo } from 'react'

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
  _elapsedDays: number | undefined,
  averageDailySales: number,
): ComparisonSlice {
  // Phase O6: core 直接呼び出し。
  // scope は frame.comparison から取得 (wrapper の scope 構築を skip)。
  // projectionContext は periodSelection から最小面のみ抽出。
  const projectionContext = useMemo(
    () => buildComparisonProjectionContext(periodSelection),
    [periodSelection],
  )

  return useComparisonModuleCore({
    scope: frame.comparison,
    projectionContext,
    currentAverageDailySales: averageDailySales,
  })
}
