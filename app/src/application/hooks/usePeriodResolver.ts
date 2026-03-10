/**
 * 期間選択フック — periodSelectionStore のセレクタ
 *
 * Admin UI や期間選択 UI で使用する。
 */
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

/**
 * periodSelectionStore の selection をそのまま返すセレクタフック
 *
 * selection 全体とアクション関数にアクセスする。
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
