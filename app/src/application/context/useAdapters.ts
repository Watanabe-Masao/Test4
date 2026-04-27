/**
 * Adapter 取得 hooks
 *
 * 消費者は直接 adapter ファイルを import せず、これらの hook で取得する。
 * AdapterProvider が必ずラップされていることを前提とする。
 *
 * @responsibility R:unclassified
 */
import { useContext } from 'react'
import { AdapterContext } from './adapterContextDef'
import type { WeatherPort } from '@/domain/ports/WeatherPort'
import type { BackupPort } from '@/domain/ports/BackupPort'
import type { FileSystemPort } from '@/domain/ports/FileSystemPort'
import type { StoragePersistencePort } from '@/domain/ports/StoragePersistencePort'

function useAdapterSet() {
  const ctx = useContext(AdapterContext)
  if (!ctx) {
    throw new Error('useAdapters must be used within an AdapterProvider')
  }
  return ctx
}

export function useWeatherAdapter(): WeatherPort {
  return useAdapterSet().weather
}

export function useBackupAdapter(): BackupPort {
  return useAdapterSet().backup
}

export function useFileSystemAdapter(): FileSystemPort {
  return useAdapterSet().fileSystem
}

export function useStoragePersistenceAdapter(): StoragePersistencePort {
  return useAdapterSet().storagePersistence
}
