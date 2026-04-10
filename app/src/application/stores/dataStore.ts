/** @guard C3 store は state 反映のみ */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StoreExplanations } from '@/domain/models/analysis'
import type { ValidationMessage, InventoryConfig } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData, AppData } from '@/domain/models/MonthlyData'
import { mergeInventoryConfig } from '@/domain/models/record'

// ─── Types ────────────────────────────────────────────
export interface DataStore {
  // ─── Authoritative State（正本） ──────────────────────
  appData: AppData
  currentMonthData: MonthlyData | null
  authoritativeDataVersion: number
  comparisonDataVersion: number

  // ─── Derived State ──────────────────────────────────
  storeResults: ReadonlyMap<string, StoreResult>
  storeExplanations: ReadonlyMap<string, StoreExplanations>
  validationMessages: readonly ValidationMessage[]

  // ─── Actions ────────────────────────────────────────
  setCurrentMonthData: (monthly: MonthlyData) => void
  setPrevYearMonthData: (monthly: MonthlyData | null) => void
  replaceAppData: (appData: AppData) => void
  setStoreResults: (results: ReadonlyMap<string, StoreResult>) => void
  setStoreExplanations: (explanations: ReadonlyMap<string, StoreExplanations>) => void
  setValidationMessages: (messages: readonly ValidationMessage[]) => void
  updateInventory: (storeId: string, config: Partial<InventoryConfig>) => void
  reset: () => void
}

// ─── Store ────────────────────────────────────────────
export const useDataStore = create<DataStore>()(
  devtools(
    (set) => ({
      appData: { current: null, prevYear: null },
      currentMonthData: null,
      authoritativeDataVersion: 0,
      comparisonDataVersion: 0,

      storeResults: new Map(),
      storeExplanations: new Map(),
      validationMessages: [],

      // ─── Actions ──────────────────────────────────
      setCurrentMonthData: (monthly) =>
        set(
          (state) => ({
            appData: { current: monthly, prevYear: state.appData.prevYear },
            currentMonthData: monthly,
            storeResults: new Map(),
            authoritativeDataVersion: state.authoritativeDataVersion + 1,
          }),
          false,
          'setCurrentMonthData',
        ),

      setPrevYearMonthData: (monthly) =>
        set(
          (state) => ({
            appData: { current: state.appData.current, prevYear: monthly },
            comparisonDataVersion: state.comparisonDataVersion + 1,
          }),
          false,
          'setPrevYearMonthData',
        ),

      replaceAppData: (newAppData) =>
        set(
          (state) => ({
            appData: newAppData,
            currentMonthData: newAppData.current,
            authoritativeDataVersion:
              newAppData.current !== state.appData.current
                ? state.authoritativeDataVersion + 1
                : state.authoritativeDataVersion,
            comparisonDataVersion:
              newAppData.prevYear !== state.appData.prevYear
                ? state.comparisonDataVersion + 1
                : state.comparisonDataVersion,
          }),
          false,
          'replaceAppData',
        ),

      setStoreResults: (results) => set({ storeResults: results }, false, 'setStoreResults'),

      setStoreExplanations: (explanations) =>
        set({ storeExplanations: explanations }, false, 'setStoreExplanations'),

      setValidationMessages: (messages) =>
        set({ validationMessages: messages }, false, 'setValidationMessages'),

      updateInventory: (storeId, config) =>
        set(
          (state) => {
            const currentSettings = state.currentMonthData?.settings ?? new Map()
            const newSettings = new Map(currentSettings)
            const merged = mergeInventoryConfig(newSettings.get(storeId), storeId, config)
            newSettings.set(storeId, merged)
            const updatedCurrentMonth = state.currentMonthData
              ? { ...state.currentMonthData, settings: newSettings }
              : null
            return {
              appData: { current: updatedCurrentMonth, prevYear: state.appData.prevYear },
              currentMonthData: updatedCurrentMonth,
              authoritativeDataVersion: state.authoritativeDataVersion + 1,
            }
          },
          false,
          'updateInventory',
        ),

      reset: () =>
        set(
          () => ({
            appData: { current: null, prevYear: null },
            currentMonthData: null,
            authoritativeDataVersion: 0,
            comparisonDataVersion: 0,
            storeResults: new Map(),
            storeExplanations: new Map(),
            validationMessages: [],
          }),
          false,
          'reset',
        ),
    }),
    { name: 'DataStore' },
  ),
)

// ─── Authoritative Selectors ─────────────────────────

export function useCurrentMonthData(): MonthlyData | null {
  return useDataStore((s) => s.currentMonthData)
}

export function useAppData(): AppData {
  return useDataStore((s) => s.appData)
}
