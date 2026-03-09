/**
 * 期間解決フック — PeriodNeed に応じて必要な期間のみ返す
 *
 * periodSelectionStore を内部購読し、PeriodNeed に応じて
 * 必要最小限の期間データを返す。不要なデータは undefined。
 *
 * ## 設計意図
 *
 * ウィジェットは PeriodNeed を宣言するだけで、期間の算出ロジックを持たない。
 * 仕分けの責務はこのフックに集約される。
 *
 * ## パフォーマンス
 *
 * - useMemo で依存値が変わらない限り再計算しない
 * - PeriodNeed ごとに必要な計算のみ実行
 * - 隣接月の算出は adjacent / comparisonFull 時のみ
 */
import { useMemo } from 'react'
import type { PeriodNeed, ResolvedPeriods } from '@/domain/patterns/period'
import { calcAdjacentMonths } from '@/domain/models/PeriodSelection'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

/**
 * PeriodNeed に応じて必要な期間のみ解決する
 *
 * @param need ウィジェットが必要とする期間の種類
 * @returns 解決済みの期間セット
 *
 * @example
 * // KPI カード（当期のみ）
 * const periods = usePeriodResolver('current')
 * periods.period1  // always present
 * periods.period2  // undefined
 *
 * @example
 * // 前年比チャート
 * const periods = usePeriodResolver('comparison')
 * periods.period1  // always present
 * periods.period2  // present if comparisonEnabled
 */
export function usePeriodResolver(need: PeriodNeed): ResolvedPeriods {
  const selection = usePeriodSelectionStore((s) => s.selection)

  return useMemo<ResolvedPeriods>(() => {
    const base: ResolvedPeriods = {
      period1: selection.period1,
      comparisonEnabled: selection.comparisonEnabled,
      selection,
    }

    // current: period1 のみ
    if (need === 'current') {
      return base
    }

    // comparison: period1 + period2
    if (need === 'comparison') {
      return {
        ...base,
        period2: selection.comparisonEnabled ? selection.period2 : undefined,
      }
    }

    // adjacent: period1 + 前後1ヶ月
    if (need === 'adjacent') {
      return {
        ...base,
        period1Adjacent: calcAdjacentMonths(selection.period1),
      }
    }

    // comparisonFull: period1 + period2 + 両方の隣接月
    return {
      ...base,
      period2: selection.comparisonEnabled ? selection.period2 : undefined,
      period1Adjacent: calcAdjacentMonths(selection.period1),
      period2Adjacent:
        selection.comparisonEnabled ? calcAdjacentMonths(selection.period2) : undefined,
    }
  }, [selection, need])
}

/**
 * periodSelectionStore の selection をそのまま返すセレクタフック
 *
 * usePeriodResolver を使わずに selection 全体にアクセスしたい場合に使用。
 * 主に Admin UI や期間選択 UI で使用する。
 */
export function usePeriodSelection() {
  const selection = usePeriodSelectionStore((s) => s.selection)
  const setPeriod1 = usePeriodSelectionStore((s) => s.setPeriod1)
  const setPeriod2 = usePeriodSelectionStore((s) => s.setPeriod2)
  const setPreset = usePeriodSelectionStore((s) => s.setPreset)
  const setComparisonEnabled = usePeriodSelectionStore((s) => s.setComparisonEnabled)

  return { selection, setPeriod1, setPeriod2, setPreset, setComparisonEnabled }
}
