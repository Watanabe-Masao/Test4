import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { AppSettings, ViewType, StoreResult } from '@/domain/models'
import { DEFAULT_SETTINGS } from '@/domain/constants/defaults'
import type { ImportedData } from '@/infrastructure/ImportService'
import { createEmptyImportedData } from '@/infrastructure/ImportService'
import type { ValidationMessage } from '@/infrastructure/fileImport/errors'

/** アプリケーション状態 */
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
  settings: DEFAULT_SETTINGS,
}

/** アクション */
export type AppAction =
  | { type: 'SET_IMPORTED_DATA'; payload: ImportedData }
  | { type: 'SET_STORE_RESULTS'; payload: ReadonlyMap<string, StoreResult> }
  | { type: 'SET_VALIDATION_MESSAGES'; payload: readonly ValidationMessage[] }
  | { type: 'TOGGLE_STORE'; payload: string }
  | { type: 'SELECT_ALL_STORES' }
  | { type: 'SET_CURRENT_VIEW'; payload: ViewType }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'RESET' }

/** リデューサー */
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

    case 'RESET':
      return initialState

    default:
      return state
  }
}

/** コンテキスト */
const AppStateContext = createContext<AppState>(initialState)
const AppDispatchContext = createContext<React.Dispatch<AppAction>>(() => {})

/** プロバイダー */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

/** 状態を取得するフック */
export function useAppState(): AppState {
  return useContext(AppStateContext)
}

/** ディスパッチを取得するフック */
export function useAppDispatch(): React.Dispatch<AppAction> {
  return useContext(AppDispatchContext)
}
