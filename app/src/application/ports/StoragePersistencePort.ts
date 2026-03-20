/**
 * StoragePersistencePort — ストレージ永続化・クォータの契約
 *
 * infrastructure/storage/storagePersistence + storagePolicy を隠蔽する。
 * 型は infrastructure の実装型を re-export する。
 */
import type { StoragePressureLevel } from '@/infrastructure/storage/storagePolicy'

export type { StoragePressureLevel }

export interface StorageStatusResult {
  readonly estimate: { usage: number; quota: number; usageRatio: number } | null
  readonly usageFormatted: string
  readonly quotaFormatted: string
  readonly level: StoragePressureLevel
}

export interface StoragePersistencePort {
  requestPersistentStorage(): Promise<boolean>
  isStoragePersisted(): Promise<boolean>
  isOpfsAvailable(): Promise<boolean>
  getStorageStatus(): Promise<StorageStatusResult>
}
