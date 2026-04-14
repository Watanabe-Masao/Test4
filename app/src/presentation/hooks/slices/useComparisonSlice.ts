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
 * 現段階（Phase 1）では内部の comparison module がまだ `PeriodSelection` を
 * 前提としているため、互換のため `periodSelection` も併せて受け取り、
 * 内部モジュールには従来通り pass-through する。Phase 6 で内部モジュールを
 * `ComparisonScope` 直接受領に書き換えた時点で `periodSelection` 引数は
 * 削除され、slice は frame のみを入力とする形に収束する。
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
  // Phase 1: frame は入口契約として参照のみ。内部は従来の periodSelection
  // ベースで動き、frame.comparison との意味等価性は構築経路
  // (buildFreePeriodFrame: 同じ periodSelection から scope を事前構築) により
  // 保証される。Phase 6 で comparison module が ComparisonScope 直接受領に
  // なった時点で frame.comparison を直接渡す形に収束する。
  void frame

  const comparison = useComparisonModule(periodSelection, elapsedDays, averageDailySales)
  return comparison
}
