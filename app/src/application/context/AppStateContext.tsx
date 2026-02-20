/**
 * AppStateContext — Zustand ストアのバックワードコンパチビリティレイヤー
 *
 * 既存の useAppState / useAppDispatch / useAppData / useAppUi / useAppSettings
 * フックの API を維持しつつ、内部的には Zustand ストアを使用する。
 *
 * 新規コードでは application/stores から直接 useDataStore / useUiStore / useSettingsStore
 * を使用することを推奨。
 */
import { useCallback, type ReactNode } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type {
  AppSettings,
  ViewType,
  StoreResult,
  InventoryConfig,
  ImportedData,
  ValidationMessage,
  SalesData,
  DiscountData,
  CategoryTimeSalesData,
} from '@/domain/models'

// ─── State types (re-export for backward compat) ──────

/** UI 状態スライス */
export interface UiState {
  readonly selectedStoreIds: ReadonlySet<string>
  readonly currentView: ViewType
  readonly isCalculated: boolean
  readonly isImporting: boolean
}

/** データ状態スライス */
export interface DataState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
}

/** アプリケーション状態 (統合ビュー) */
export interface AppState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
  readonly ui: UiState
  readonly settings: AppSettings
}

// ─── Actions (backward compat type) ──────────────────

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

// ─── Legacy reducer (re-export for tests) ────────────

export { initialState, appReducer } from './legacyReducer'

// ─── Provider ────────────────────────────────────────
// Zustand はグローバルストアのため Provider 不要だが、
// 既存の <AppStateProvider> ラッパーとの互換性を維持する。

export function AppStateProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ─── Hooks ───────────────────────────────────────────

/** 全状態を取得（統合ビュー — 既存互換） */
export function useAppState(): AppState {
  const data = useDataStore((s) => s.data)
  const storeResults = useDataStore((s) => s.storeResults)
  const validationMessages = useDataStore((s) => s.validationMessages)
  const selectedStoreIds = useUiStore((s) => s.selectedStoreIds)
  const currentView = useUiStore((s) => s.currentView)
  const isCalculated = useUiStore((s) => s.isCalculated)
  const isImporting = useUiStore((s) => s.isImporting)
  const settings = useSettingsStore((s) => s.settings)

  return {
    data,
    storeResults,
    validationMessages,
    ui: { selectedStoreIds, currentView, isCalculated, isImporting },
    settings,
  }
}

/** UI 状態のみ取得 */
export function useAppUi(): UiState {
  const selectedStoreIds = useUiStore((s) => s.selectedStoreIds)
  const currentView = useUiStore((s) => s.currentView)
  const isCalculated = useUiStore((s) => s.isCalculated)
  const isImporting = useUiStore((s) => s.isImporting)
  return { selectedStoreIds, currentView, isCalculated, isImporting }
}

/** データ状態のみ取得 */
export function useAppData(): DataState {
  const data = useDataStore((s) => s.data)
  const storeResults = useDataStore((s) => s.storeResults)
  const validationMessages = useDataStore((s) => s.validationMessages)
  return { data, storeResults, validationMessages }
}

/** 設定のみ取得 */
export function useAppSettings(): AppSettings {
  return useSettingsStore((s) => s.settings)
}

/** ディスパッチを取得（Zustand アクションへの変換レイヤー） */
export function useAppDispatch(): (action: AppAction) => void {
  return useCallback((action: AppAction) => {
    switch (action.type) {
      case 'SET_IMPORTED_DATA':
        useDataStore.getState().setImportedData(action.payload)
        useUiStore.getState().invalidateCalculation()
        break

      case 'SET_STORE_RESULTS':
        useDataStore.getState().setStoreResults(action.payload)
        useUiStore.getState().setCalculated(true)
        break

      case 'SET_VALIDATION_MESSAGES':
        useDataStore.getState().setValidationMessages(action.payload)
        break

      case 'TOGGLE_STORE':
        useUiStore.getState().toggleStore(action.payload)
        break

      case 'SELECT_ALL_STORES':
        useUiStore.getState().selectAllStores()
        break

      case 'SET_CURRENT_VIEW':
        useUiStore.getState().setCurrentView(action.payload)
        break

      case 'SET_IMPORTING':
        useUiStore.getState().setImporting(action.payload)
        break

      case 'UPDATE_SETTINGS':
        useSettingsStore.getState().updateSettings(action.payload)
        useUiStore.getState().invalidateCalculation()
        break

      case 'UPDATE_INVENTORY':
        useDataStore.getState().updateInventory(action.payload.storeId, action.payload.config)
        useUiStore.getState().invalidateCalculation()
        break

      case 'SET_PREV_YEAR_AUTO_DATA':
        useDataStore.getState().setPrevYearAutoData(action.payload)
        useUiStore.getState().invalidateCalculation()
        break

      case 'RESET':
        useDataStore.getState().reset()
        useUiStore.getState().reset()
        useSettingsStore.getState().reset()
        break
    }
  }, [])
}
