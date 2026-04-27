/**
 * @guard C3 store は state 反映のみ
 *
 * @responsibility R:unclassified
 */
import { create } from 'zustand'
import { z } from 'zod'
import { devtools, persist } from 'zustand/middleware'
import { getZustandStorage, STORAGE_KEYS } from '@/application/adapters/uiPersistenceAdapter'

// ─── Types ────────────────────────────────────────────
export type CurrencyUnit = 'sen' | 'yen'

export interface UiStore {
  // State
  selectedStoreIds: ReadonlySet<string>
  isCalculated: boolean
  isImporting: boolean
  currencyUnit: CurrencyUnit

  // Actions
  toggleStore: (storeId: string) => void
  selectAllStores: () => void
  setImporting: (isImporting: boolean) => void
  setCalculated: (isCalculated: boolean) => void
  invalidateCalculation: () => void
  setCurrencyUnit: (unit: CurrencyUnit) => void
  resetTransientState: () => void
}

// ─── Store ────────────────────────────────────────────
export const useUiStore = create<UiStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        selectedStoreIds: new Set<string>(),
        isCalculated: false,
        isImporting: false,
        currencyUnit: 'sen' as CurrencyUnit,

        // Actions
        toggleStore: (storeId) =>
          set(
            (state) => {
              const next = new Set(state.selectedStoreIds)
              if (next.has(storeId)) next.delete(storeId)
              else next.add(storeId)
              return { selectedStoreIds: next }
            },
            false,
            'toggleStore',
          ),

        selectAllStores: () =>
          set({ selectedStoreIds: new Set<string>() }, false, 'selectAllStores'),

        setImporting: (isImporting) => set({ isImporting }, false, 'setImporting'),

        setCalculated: (isCalculated) => set({ isCalculated }, false, 'setCalculated'),

        invalidateCalculation: () => set({ isCalculated: false }, false, 'invalidateCalculation'),

        setCurrencyUnit: (unit) => set({ currencyUnit: unit }, false, 'setCurrencyUnit'),

        resetTransientState: () =>
          set(
            {
              selectedStoreIds: new Set<string>(),
              isCalculated: false,
              isImporting: false,
            },
            false,
            'resetTransientState',
          ),
      }),
      {
        name: STORAGE_KEYS.UI,
        // Set のシリアライズ/デシリアライズ対応（adapter 経由）
        storage: {
          getItem: (name) => {
            const backend = getZustandStorage()
            const raw = backend.getItem(name)
            if (!raw) return null
            try {
              const parsed = JSON.parse(raw)
              // zustand persist の構造検証
              const persistSchema = z
                .object({
                  state: z
                    .object({
                      selectedStoreIds: z.union([z.array(z.string()), z.instanceof(Set)]),
                      currencyUnit: z.enum(['sen', 'yen']).optional(),
                    })
                    .passthrough(),
                })
                .passthrough()
              const validated = persistSchema.safeParse(parsed)
              if (!validated.success) {
                console.warn('[uiStore] hydration schema mismatch:', validated.error.message)
                return null
              }
              // Set の復元
              if (parsed?.state?.selectedStoreIds) {
                parsed.state.selectedStoreIds = new Set(parsed.state.selectedStoreIds)
              }
              return parsed
            } catch {
              return null
            }
          },
          setItem: (name, value) => {
            const serialized = {
              ...value,
              state: {
                ...value.state,
                // Set をシリアライズ
                selectedStoreIds: value.state.selectedStoreIds
                  ? Array.from(value.state.selectedStoreIds)
                  : [],
              },
            }
            const backend = getZustandStorage()
            backend.setItem(name, JSON.stringify(serialized))
          },
          removeItem: (name) => {
            const backend = getZustandStorage()
            backend.removeItem(name)
          },
        },
        partialize: (state) =>
          ({
            currencyUnit: state.currencyUnit,
          }) as UiStore,
      },
    ),
    { name: 'UiStore' },
  ),
)
