/**
 * 比較フレームフック
 *
 * settingsStore のアライメント設定を読み、resolveComparisonFrame を呼ぶ。
 * 全ページ・全チャートの入口として使用する。
 */
import { useMemo } from 'react'
import type { DateRange, ComparisonFrame } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { resolveComparisonFrame } from '@/application/comparison/resolveComparisonFrame'

/**
 * 当年の日付範囲から ComparisonFrame を生成する。
 *
 * settingsStore の alignmentPolicy, prevYearSourceYear/Month/DowOffset を自動購読する。
 */
export function useComparisonFrame(currentRange: DateRange): ComparisonFrame {
  const settings = useSettingsStore((s) => s.settings)

  return useMemo(
    () =>
      resolveComparisonFrame(currentRange, settings.alignmentPolicy ?? 'sameDayOfWeek', {
        sourceYear: settings.prevYearSourceYear,
        sourceMonth: settings.prevYearSourceMonth,
        dowOffset: settings.prevYearDowOffset,
      }),
    [
      currentRange,
      settings.alignmentPolicy,
      settings.prevYearSourceYear,
      settings.prevYearSourceMonth,
      settings.prevYearDowOffset,
    ],
  )
}
