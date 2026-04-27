/**
 * useComparisonScope — 売上非依存の比較スコープ hook
 *
 * buildComparisonScope の薄いラッパー。年月 + alignmentPolicy から
 * PrevYearScope（前年日付範囲 + dowOffset）を構築する。
 *
 * useComparisonModule が売上データの集計まで担うのに対し、
 * この hook は日付解決のみを提供する。天気ページなど売上データなしで
 * 前年比較が必要な画面から使用する。
 *
 * 日付解決ロジックは domain/models/ComparisonScope.ts の
 * buildComparisonScope() に完全に委譲する（独自計算しない）。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { AlignmentMode } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { PrevYearScope } from '@/domain/models/ComparisonScope'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'
import { createDefaultPeriodSelection, applyPreset } from '@/domain/models/PeriodSelection'

/** AlignmentMode → ComparisonPreset のマッピング */
const ALIGNMENT_TO_PRESET: Record<AlignmentMode, ComparisonPreset> = {
  sameDate: 'prevYearSameMonth',
  sameDayOfWeek: 'prevYearSameDow',
}

/**
 * 売上非依存の比較スコープ構築。
 *
 * @param year 当期の年
 * @param month 当期の月
 * @param alignmentMode 比較モード（Settings.alignmentPolicy と同じ型）
 * @param elapsedDays 経過日数（月途中の場合。省略時は月末まで）
 * @returns PrevYearScope（前年日付範囲 + dowOffset）。比較不可時は undefined。
 */
export function useComparisonScope(
  year: number,
  month: number,
  alignmentMode: AlignmentMode,
  elapsedDays?: number,
): PrevYearScope | undefined {
  return useMemo(() => {
    const preset = ALIGNMENT_TO_PRESET[alignmentMode]
    const base = createDefaultPeriodSelection(year, month)

    // preset が異なる場合は period2 を再計算
    const selection =
      preset === base.activePreset
        ? base
        : {
            ...base,
            period2: applyPreset(base.period1, preset, base.period1),
            activePreset: preset,
          }

    const scope = buildComparisonScope(selection, elapsedDays)

    return {
      dateRange: scope.effectivePeriod2,
      totalCustomers: 0, // 売上非依存のため客数は 0
      dowOffset: scope.dowOffset,
    }
  }, [year, month, alignmentMode, elapsedDays])
}
