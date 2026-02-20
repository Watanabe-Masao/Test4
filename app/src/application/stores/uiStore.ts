import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ViewType } from '@/domain/models'

// ─── Types ────────────────────────────────────────────
export interface UiStore {
  // State
  selectedStoreIds: ReadonlySet<string>
  currentView: ViewType
  isCalculated: boolean
  isImporting: boolean

  // Actions
  toggleStore: (storeId: string) => void
  selectAllStores: () => void
  setCurrentView: (view: ViewType) => void
  setImporting: (isImporting: boolean) => void
  setCalculated: (isCalculated: boolean) => void
  invalidateCalculation: () => void
  reset: () => void
}

// ─── Store ────────────────────────────────────────────
export const useUiStore = create<UiStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        selectedStoreIds: new Set<string>(),
        currentView: 'dashboard' as ViewType,
        isCalculated: false,
        isImporting: false,

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

        setCurrentView: (view) =>
          set({ currentView: view }, false, 'setCurrentView'),

        setImporting: (isImporting) =>
          set({ isImporting }, false, 'setImporting'),

        setCalculated: (isCalculated) =>
          set({ isCalculated }, false, 'setCalculated'),

        invalidateCalculation: () =>
          set({ isCalculated: false }, false, 'invalidateCalculation'),

        reset: () =>
          set(
            {
              selectedStoreIds: new Set<string>(),
              isCalculated: false,
              isImporting: false,
            },
            false,
            'reset',
          ),
      }),
      {
        name: 'shiire-arari-ui',
        // Set のシリアライズ/デシリアライズ対応
        storage: {
          getItem: (name) => {
            const raw = localStorage.getItem(name)
            if (!raw) return null
            try {
              const parsed = JSON.parse(raw)
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
            localStorage.setItem(name, JSON.stringify(serialized))
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
        partialize: (state) => ({
          currentView: state.currentView,
        }),
      },
    ),
    { name: 'UiStore' },
  ),
)
