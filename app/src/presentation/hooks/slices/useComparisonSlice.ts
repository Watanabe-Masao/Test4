/**
 * useComparisonSlice — 比較期間・モード slice
 *
 * comparison scope / prevYear / dowGap / kpi を統合して返す。
 * useUnifiedWidgetContext の context slice として比較関連の依存を局所化する。
 */
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import { useComparisonModule } from '@/application/hooks/useComparisonModule'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { PrevYearScope } from '@/domain/models/ComparisonScope'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'

export interface ComparisonSlice {
  readonly daily: PrevYearData
  readonly kpi: PrevYearMonthlyKpi
  readonly scope: ComparisonScope | null
  readonly dowGap: DowGapAnalysis
  readonly prevYearScope: PrevYearScope | undefined
}

export function useComparisonSlice(
  periodSelection: PeriodSelection,
  elapsedDays: number | undefined,
  averageDailySales: number,
): ComparisonSlice {
  const comparison = useComparisonModule(periodSelection, elapsedDays, averageDailySales)
  return comparison
}
