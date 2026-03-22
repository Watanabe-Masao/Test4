/**
 * periodSelectionStore — 期間選択の Zustand ストア
 *
 * period1（当期）と period2（比較期）の自由日付範囲を管理する。
 * Zustand persist で LocalStorage に永続化。
 *
 * ## 責務
 *
 * - period1 / period2 の DateRange を保持
 * - プリセット適用時に period2 を自動算出
 * - 比較 ON/OFF の管理
 * - 月切替時の初期化（resetToMonth）
 *
 * ## 連動ルール
 *
 * - period1 変更時: activePreset ≠ custom なら period2 も再算出（プリセット連動）
 * - period2 変更時: activePreset を custom に（自由指定モード）
 * - プリセット変更時: period2 を自動算出
 * - 期間-1 スライダーを動かしても期間-2 は連動しない（自由選択）
 * - プリセット使用時のみ連動
 *
 * @guard C3 store は state 反映のみ
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { PeriodSelection, ComparisonPreset } from '@/domain/models/PeriodSelection'
import { applyPreset, createDefaultPeriodSelection } from '@/domain/models/PeriodSelection'

// ─── Types ────────────────────────────────────────────

export interface PeriodSelectionStore {
  // State
  selection: PeriodSelection

  // Actions
  /** period1 を変更。activePreset ≠ custom なら period2 も連動して再算出 */
  setPeriod1: (range: DateRange) => void
  /** period2 を変更。activePreset を custom に切り替え */
  setPeriod2: (range: DateRange) => void
  /** プリセットを変更 → period2 を自動算出 */
  setPreset: (preset: ComparisonPreset) => void
  /** 比較 ON/OFF を切り替え */
  setComparisonEnabled: (enabled: boolean) => void
  /** 月切替時の初期化（月全日、プリセット再適用） */
  resetToMonth: (year: number, month: number) => void
}

// ─── Store ────────────────────────────────────────────

const now = new Date()
const DEFAULT_SELECTION = createDefaultPeriodSelection(now.getFullYear(), now.getMonth() + 1)

export const usePeriodSelectionStore = create<PeriodSelectionStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        selection: DEFAULT_SELECTION,

        // Actions
        setPeriod1: (range) =>
          set(
            (state) => {
              const { selection } = state
              if (selection.activePreset === 'custom') {
                // 自由指定中: period2 は連動しない
                return { selection: { ...selection, period1: range } }
              }
              // プリセット適用中: period2 も再算出
              const period2 = applyPreset(range, selection.activePreset, selection.period2)
              return { selection: { ...selection, period1: range, period2 } }
            },
            false,
            'setPeriod1',
          ),

        setPeriod2: (range) =>
          set(
            (state) => ({
              selection: {
                ...state.selection,
                period2: range,
                activePreset: 'custom',
              },
            }),
            false,
            'setPeriod2',
          ),

        setPreset: (preset) =>
          set(
            (state) => {
              const { selection } = state
              const period2 = applyPreset(selection.period1, preset, selection.period2)
              return {
                selection: { ...selection, activePreset: preset, period2 },
              }
            },
            false,
            'setPreset',
          ),

        setComparisonEnabled: (enabled) =>
          set(
            (state) => ({
              selection: { ...state.selection, comparisonEnabled: enabled },
            }),
            false,
            'setComparisonEnabled',
          ),

        resetToMonth: (year, month) =>
          set(
            (state) => {
              const newSelection = createDefaultPeriodSelection(year, month)
              // プリセットは現在のものを維持し、新しい period1 に対して再適用
              const period2 = applyPreset(
                newSelection.period1,
                state.selection.activePreset,
                newSelection.period2,
              )
              return {
                selection: {
                  ...newSelection,
                  activePreset: state.selection.activePreset,
                  comparisonEnabled: state.selection.comparisonEnabled,
                  period2,
                },
              }
            },
            false,
            'resetToMonth',
          ),
      }),
      {
        name: 'shiire-arari-period-selection',
        partialize: (state) => ({ selection: state.selection }),
        merge: (persisted, current) => {
          const stored = persisted as { selection?: Partial<PeriodSelection> }
          if (!stored?.selection?.period1 || !stored?.selection?.period2) {
            // 永続化データが不完全な場合はデフォルトを使用
            return current
          }
          return {
            ...current,
            selection: {
              ...current.selection,
              ...stored.selection,
            } as PeriodSelection,
          }
        },
      },
    ),
    { name: 'PeriodSelectionStore' },
  ),
)
