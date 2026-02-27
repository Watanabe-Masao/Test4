export { AppStateProvider } from './AppStateProvider'
export {
  useAppState,
  useAppUi,
  useAppData,
  useAppSettings,
  useAppDispatch,
} from './AppStateContext'
export type { AppState, AppAction, UiState, DataState } from './AppStateContext'
export { appReducer, initialState } from './legacyReducer'

export { RepositoryProvider } from './RepositoryContext'
export { useRepository } from './useRepository'

// Zustand stores (direct access — 新規コード向け)
export { useDataStore, useUiStore, useSettingsStore } from '@/application/stores'
