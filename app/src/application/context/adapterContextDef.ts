/**
 * AdapterContext 型定義
 *
 * 4つのポートアダプターを Context 経由で DI する。
 * 消費者は直接 adapter を import せず、useXxxAdapter() hook で取得する。
 */
import { createContext } from 'react'
import type { WeatherPort } from '@/domain/ports/WeatherPort'
import type { BackupPort } from '@/domain/ports/BackupPort'
import type { FileSystemPort } from '@/domain/ports/FileSystemPort'
import type { StoragePersistencePort } from '@/domain/ports/StoragePersistencePort'

export interface AdapterSet {
  readonly weather: WeatherPort
  readonly backup: BackupPort
  readonly fileSystem: FileSystemPort
  readonly storagePersistence: StoragePersistencePort
}

/**
 * AdapterContext — デフォルト値は null。AdapterProvider が必ずラップする。
 */
export const AdapterContext = createContext<AdapterSet | null>(null)
