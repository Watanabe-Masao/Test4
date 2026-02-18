import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react'
import type { AppSettings, ViewType, StoreResult, InventoryConfig, ImportedData, ValidationMessage } from '@/domain/models'
import { createDefaultSettings } from '@/domain/constants/defaults'
import { createEmptyImportedData } from '@/domain/models'

// ─── State types ──────────────────────────────────────────

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

/** アプリケーション状態 */
export interface AppState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
  readonly ui: UiState
  readonly settings: AppSettings
}

/** 初期状態 */
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

// ─── Actions ──────────────────────────────────────────────

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
  | { type: 'RESET' }

// ─── Reducer ──────────────────────────────────────────────

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

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ─── Contexts ─────────────────────────────────────────────

const UiContext = createContext<UiState>(initialState.ui)
const DataContext = createContext<DataState>({
  data: initialState.data,
  storeResults: initialState.storeResults,
  validationMessages: initialState.validationMessages,
})
const SettingsContext = createContext<AppSettings>(initialState.settings)
const AppDispatchContext = createContext<React.Dispatch<AppAction>>(() => {})

// Backward compat: full state context
const AppStateContext = createContext<AppState>(initialState)

// ─── Provider ─────────────────────────────────────────────

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const uiValue = state.ui
  const dataValue = useMemo<DataState>(() => ({
    data: state.data,
    storeResults: state.storeResults,
    validationMessages: state.validationMessages,
  }), [state.data, state.storeResults, state.validationMessages])
  const settingsValue = state.settings

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppStateContext.Provider value={state}>
        <UiContext.Provider value={uiValue}>
          <DataContext.Provider value={dataValue}>
            <SettingsContext.Provider value={settingsValue}>
              {children}
            </SettingsContext.Provider>
          </DataContext.Provider>
        </UiContext.Provider>
      </AppStateContext.Provider>
    </AppDispatchContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────

/** 全状態を取得（既存互換） */
export function useAppState(): AppState {
  return useContext(AppStateContext)
}

/** UI 状態のみ取得（店舗選択、ビュー、計算状態） */
export function useAppUi(): UiState {
  return useContext(UiContext)
}

/** データ状態のみ取得（インポートデータ、計算結果） */
export function useAppData(): DataState {
  return useContext(DataContext)
}

/** 設定のみ取得 */
export function useAppSettings(): AppSettings {
  return useContext(SettingsContext)
}

/** ディスパッチを取得 */
export function useAppDispatch(): React.Dispatch<AppAction> {
  return useContext(AppDispatchContext)
}
