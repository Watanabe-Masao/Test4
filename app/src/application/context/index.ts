/**
 * @responsibility R:unclassified
 */

export { RepositoryProvider } from './RepositoryContext'
export { PersistenceProvider } from './PersistenceProvider'
export { AdapterProvider } from './AdapterProvider'
export { useRepository } from './useRepository'
export {
  useWeatherAdapter,
  useBackupAdapter,
  useFileSystemAdapter,
  useStoragePersistenceAdapter,
} from './useAdapters'

// Zustand stores
export { useDataStore, useUiStore, useSettingsStore } from '@/application/stores'
