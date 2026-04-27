/**
 * widgetPeriodStore — ウィジェット個別期間オーバーライドの Zustand ストア
 *
 * デフォルトでは全ウィジェットがグローバル期間（periodSelectionStore）に連動する。
 * ウィジェットごとに「リンク解除」して独自の比較期間を設定可能。
 *
 * ## 設計
 *
 * - linked = true（デフォルト）: グローバル期間に連動
 * - linked = false: ウィジェット固有の期間を使用
 * - オーバーライドは比較期間（period2）のみ対象
 *   （当期 period1 は全ウィジェット共通）
 *
 * @guard C3 store は state 反映のみ
 *
 * @responsibility R:unclassified
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { DateRange } from '@/domain/models/CalendarDate'
import { createUiPersistOptions, STORAGE_KEYS } from '@/application/adapters/uiPersistenceAdapter'

/** ウィジェット個別の期間オーバーライド設定 */
export interface WidgetPeriodOverride {
  /** グローバル期間に連動するか */
  readonly linked: boolean
  /** linked=false 時の比較期間（当期は常にグローバル） */
  readonly customPeriod2: DateRange | null
}

export interface WidgetPeriodStore {
  /** ウィジェットID → オーバーライド設定 */
  overrides: ReadonlyMap<string, WidgetPeriodOverride>

  /** ウィジェットのリンク状態を切り替え */
  toggleLink: (widgetId: string, linked: boolean) => void

  /** ウィジェット個別の比較期間を設定（自動で linked=false に） */
  setCustomPeriod2: (widgetId: string, period2: DateRange) => void

  /** ウィジェットのオーバーライドをリセット（グローバル連動に戻す） */
  resetOverride: (widgetId: string) => void

  /** 全オーバーライドをクリア */
  resetAll: () => void
}

export const useWidgetPeriodStore = create<WidgetPeriodStore>()(
  devtools(
    persist(
      (set) => ({
        overrides: new Map(),

        toggleLink: (widgetId, linked) =>
          set(
            (state) => {
              const next = new Map(state.overrides)
              if (linked) {
                // リンク復帰: オーバーライドを削除
                next.delete(widgetId)
              } else {
                // リンク解除: 現在の設定を保持（customPeriod2 は後で設定）
                const existing = next.get(widgetId)
                next.set(widgetId, {
                  linked: false,
                  customPeriod2: existing?.customPeriod2 ?? null,
                })
              }
              return { overrides: next }
            },
            false,
            'toggleLink',
          ),

        setCustomPeriod2: (widgetId, period2) =>
          set(
            (state) => {
              const next = new Map(state.overrides)
              next.set(widgetId, { linked: false, customPeriod2: period2 })
              return { overrides: next }
            },
            false,
            'setCustomPeriod2',
          ),

        resetOverride: (widgetId) =>
          set(
            (state) => {
              const next = new Map(state.overrides)
              next.delete(widgetId)
              return { overrides: next }
            },
            false,
            'resetOverride',
          ),

        resetAll: () => set({ overrides: new Map() }, false, 'resetAll'),
      }),
      {
        ...createUiPersistOptions(STORAGE_KEYS.WIDGET_PERIOD_OVERRIDES),
        partialize: (state) => {
          // Map → Object for JSON serialization
          const obj: Record<string, WidgetPeriodOverride> = {}
          state.overrides.forEach((v, k) => {
            obj[k] = v
          })
          return { overrides: obj }
        },
        merge: (persisted, current) => {
          const stored = persisted as { overrides?: Record<string, WidgetPeriodOverride> }
          if (!stored?.overrides) return current
          const map = new Map<string, WidgetPeriodOverride>()
          for (const [k, v] of Object.entries(stored.overrides)) {
            if (v && typeof v.linked === 'boolean') {
              map.set(k, v)
            }
          }
          return { ...current, overrides: map }
        },
      },
    ),
    { name: 'WidgetPeriodStore' },
  ),
)

/**
 * ウィジェットの有効な比較期間を解決する。
 *
 * linked=true またはオーバーライドなし → グローバル period2 を返す
 * linked=false かつ customPeriod2 あり → カスタム期間を返す
 */
export function resolveWidgetPeriod2(
  widgetId: string,
  overrides: ReadonlyMap<string, WidgetPeriodOverride>,
  globalPeriod2: DateRange,
): { period2: DateRange; isLinked: boolean } {
  const override = overrides.get(widgetId)
  if (!override || override.linked || !override.customPeriod2) {
    return { period2: globalPeriod2, isLinked: true }
  }
  return { period2: override.customPeriod2, isLinked: false }
}
