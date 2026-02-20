/**
 * レガシー reducer — テストの後方互換性のために保持。
 * 新規コードでは application/stores を直接使用してください。
 */
import type { AppSettings, ViewType, InventoryConfig, ImportedData, ValidationMessage, SalesData, DiscountData, CategoryTimeSalesData, StoreResult } from '@/domain/models'
import { createDefaultSettings } from '@/domain/constants/defaults'
import { createEmptyImportedData } from '@/domain/models'

export interface AppState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
  readonly ui: {
    readonly selectedStoreIds: ReadonlySet<string>
    readonly currentView: ViewType
    readonly isCalculated: boolean
    readonly isImporting: boolean
  }
  readonly settings: AppSettings
}

export type AppAction =
  | { type: 'SET_IMPORTED_DATA'; payload: ImportedData }
  | { type: 'SET_STORE_RESULTS'; payload: ReadonlyMap<string, StoreResult> }
  | { type: 'SET_VALIDATION_MESSAGES'; payload: readonly ValidationMessage[] }
  | { type: 'TOGGLE_STORE'; payload: string }
  | { type: 'SELECT_ALL_STORES' }
  | { type: 'SET_CURRENT_VIEW'; payload: ViewType }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_INVENTORY'; payload: { storeId: string; config: Partial<InventoryConfig> } }
  | { type: 'SET_PREV_YEAR_AUTO_DATA'; payload: { prevYearSales: SalesData; prevYearDiscount: DiscountData; prevYearCategoryTimeSales: CategoryTimeSalesData } }
  | { type: 'RESET' }

export const initialState: AppState = {
  data: createEmptyImportedData(),
  storeResults: new Map(),
  validationMessages: [],
  ui: {
    selectedStoreIds: new Set<string>(),
    currentView: 'dashboard',
    isCalculated: false,
    isImporting: false,
  },
  settings: createDefaultSettings(),
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_IMPORTED_DATA':
      return {
        ...state,
        data: action.payload,
        ui: { ...state.ui, isCalculated: false },
      }

    case 'SET_STORE_RESULTS':
      return {
        ...state,
        storeResults: action.payload,
        ui: { ...state.ui, isCalculated: true },
      }

    case 'SET_VALIDATION_MESSAGES':
      return { ...state, validationMessages: action.payload }

    case 'TOGGLE_STORE': {
      const next = new Set(state.ui.selectedStoreIds)
      if (next.has(action.payload)) {
        next.delete(action.payload)
      } else {
        next.add(action.payload)
      }
      return { ...state, ui: { ...state.ui, selectedStoreIds: next } }
    }

    case 'SELECT_ALL_STORES':
      return { ...state, ui: { ...state.ui, selectedStoreIds: new Set<string>() } }

    case 'SET_CURRENT_VIEW':
      return { ...state, ui: { ...state.ui, currentView: action.payload } }

    case 'SET_IMPORTING':
      return { ...state, ui: { ...state.ui, isImporting: action.payload } }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        ui: { ...state.ui, isCalculated: false },
      }

    case 'UPDATE_INVENTORY': {
      const { storeId, config } = action.payload
      const newSettings = new Map(state.data.settings)
      const existing = newSettings.get(storeId) ?? {
        storeId,
        openingInventory: null,
        closingInventory: null,
        grossProfitBudget: null,
      }
      newSettings.set(storeId, { ...existing, ...config })
      return {
        ...state,
        data: { ...state.data, settings: newSettings },
        ui: { ...state.ui, isCalculated: false },
      }
    }

    case 'SET_PREV_YEAR_AUTO_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          prevYearSales: action.payload.prevYearSales,
          prevYearDiscount: action.payload.prevYearDiscount,
          prevYearCategoryTimeSales: action.payload.prevYearCategoryTimeSales,
        },
        ui: { ...state.ui, isCalculated: false },
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}
