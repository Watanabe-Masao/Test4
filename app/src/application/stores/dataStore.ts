/** @guard C3 store は state 反映のみ */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StoreExplanations } from '@/domain/models/analysis'
import type { ValidationMessage, InventoryConfig } from '@/domain/models/record'
import type { ImportedData, StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData, AppData } from '@/domain/models/MonthlyData'
import { mergeInventoryConfig } from '@/domain/models/record'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import { toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'

// ─── Types ────────────────────────────────────────────
export interface DataStore {
  // ─── Authoritative State（正本） ──────────────────────
  appData: AppData
  currentMonthData: MonthlyData | null
  authoritativeDataVersion: number
  comparisonDataVersion: number

  // ─── Calculation Pipeline（計算パイプライン用） ────────
  /** @internal 計算パイプライン用 ImportedData ミラー。直接読み取り禁止。 */
  readonly _calculationData: ImportedData

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

// ─── Initial values ──────────────────────────────────
const initialCalcData = createEmptyImportedData()

// ─── Store ────────────────────────────────────────────
export const useDataStore = create<DataStore>()(
  devtools(
    (set) => ({
      // Authoritative State
      appData: { current: null, prevYear: null },
      currentMonthData: null,
      authoritativeDataVersion: 0,
      comparisonDataVersion: 0,

      // Calculation Pipeline
      _calculationData: initialCalcData,

      // Derived State
      storeResults: new Map(),
      storeExplanations: new Map(),
      validationMessages: [],

      // ─── Actions ──────────────────────────────────
      setCurrentMonthData: (monthly) =>
        set(
          (state) => {
            const calcData = toLegacyImportedData({ current: monthly, prevYear: null })
            const nextVersion = state.authoritativeDataVersion + 1
            return {
              appData: { current: monthly, prevYear: state.appData.prevYear },
              currentMonthData: monthly,
              authoritativeDataVersion: nextVersion,
              _calculationData: calcData,
            }
          },
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
          (state) => {
            const nextAuth =
              newAppData.current !== state.appData.current
                ? state.authoritativeDataVersion + 1
                : state.authoritativeDataVersion
            const nextComp =
              newAppData.prevYear !== state.appData.prevYear
                ? state.comparisonDataVersion + 1
                : state.comparisonDataVersion
            return {
              appData: newAppData,
              currentMonthData: newAppData.current,
              authoritativeDataVersion: nextAuth,
              comparisonDataVersion: nextComp,
              ...(newAppData.current
                ? {
                    _calculationData: toLegacyImportedData({
                      current: newAppData.current,
                      prevYear: null,
                    }),
                  }
                : {}),
            }
          },
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
            const nextVersion = state.authoritativeDataVersion + 1
            return {
              appData: { current: updatedCurrentMonth, prevYear: state.appData.prevYear },
              currentMonthData: updatedCurrentMonth,
              authoritativeDataVersion: nextVersion,
              _calculationData: { ...state._calculationData, settings: newSettings },
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
            _calculationData: initialCalcData,
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
