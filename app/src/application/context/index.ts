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

export { RepositoryProvider, useRepository } from './RepositoryContext'

// Zustand stores (direct access — 新規コード向け)
export { useDataStore, useUiStore, useSettingsStore } from '@/application/stores'
