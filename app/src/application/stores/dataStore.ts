import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ImportedData, StoreResult, ValidationMessage, SalesData, DiscountData, CategoryTimeSalesData, InventoryConfig } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'

// ─── Types ────────────────────────────────────────────
export interface DataStore {
  // State
  data: ImportedData
  storeResults: ReadonlyMap<string, StoreResult>
  validationMessages: readonly ValidationMessage[]

  // Actions
  setImportedData: (data: ImportedData) => void
  setStoreResults: (results: ReadonlyMap<string, StoreResult>) => void
  setValidationMessages: (messages: readonly ValidationMessage[]) => void
  setPrevYearAutoData: (payload: {
    prevYearSales: SalesData
    prevYearDiscount: DiscountData
    prevYearCategoryTimeSales: CategoryTimeSalesData
  }) => void
  updateInventory: (storeId: string, config: Partial<InventoryConfig>) => void
  reset: () => void
}

// ─── Initial values ──────────────────────────────────
const initialData = createEmptyImportedData()

// ─── Store ────────────────────────────────────────────
export const useDataStore = create<DataStore>()(
  devtools(
    (set) => ({
      // State
      data: initialData,
      storeResults: new Map(),
      validationMessages: [],

      // Actions
      setImportedData: (data) =>
        set({ data }, false, 'setImportedData'),

      setStoreResults: (results) =>
        set({ storeResults: results }, false, 'setStoreResults'),

      setValidationMessages: (messages) =>
        set({ validationMessages: messages }, false, 'setValidationMessages'),

      setPrevYearAutoData: ({ prevYearSales, prevYearDiscount, prevYearCategoryTimeSales }) =>
        set(
          (state) => ({
            data: {
              ...state.data,
              prevYearSales,
              prevYearDiscount,
              prevYearCategoryTimeSales,
            },
          }),
          false,
          'setPrevYearAutoData',
        ),

      updateInventory: (storeId, config) =>
        set(
          (state) => {
            const newSettings = new Map(state.data.settings)
            const existing = newSettings.get(storeId) ?? {
              storeId,
              openingInventory: null,
              closingInventory: null,
              grossProfitBudget: null,
            }
            newSettings.set(storeId, { ...existing, ...config })
            return { data: { ...state.data, settings: newSettings } }
          },
          false,
          'updateInventory',
        ),

      reset: () =>
        set(
          { data: initialData, storeResults: new Map(), validationMessages: [] },
          false,
          'reset',
        ),
    }),
    { name: 'DataStore' },
  ),
)
