export {
  AppStateProvider,
  useAppState,
  useAppUi,
  useAppData,
  useAppSettings,
  useAppDispatch,
  appReducer,
  initialState,
} from './AppStateContext'
export type { AppState, AppAction, UiState, DataState } from './AppStateContext'

export { RepositoryProvider, useRepository } from './RepositoryContext'

// Zustand stores (direct access — 新規コード向け)
export { useDataStore, useUiStore, useSettingsStore } from '@/application/stores'
