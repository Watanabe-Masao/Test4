/**
 * PeriodSelection → FreePeriodAnalysisFrame 変換 factory
 *
 * PeriodSelection（UI の期間選択状態）を分析入力契約に変換する。
 * ComparisonScope の構築は buildComparisonScope に委譲する。
 */
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'

/**
 * PeriodSelection + 店舗集合 → FreePeriodAnalysisFrame を構築する。
 *
 * @param selection 期間選択（source of truth）
 * @param storeIds 対象店舗ID集合
 * @param elapsedDays データ有効末日（period1 の cap 用）
 */
export function buildFreePeriodFrame(
  selection: PeriodSelection,
  storeIds: readonly string[],
  elapsedDays?: number,
): FreePeriodAnalysisFrame {
  const comparison: ComparisonScope | null = selection.comparisonEnabled
    ? buildComparisonScope(selection, elapsedDays)
    : null

  return {
    kind: 'free-period',
    anchorRange: selection.period1,
    storeIds,
    granularity: 'day', // default; 将来拡張で selection から導出
    comparison,
  }
}
