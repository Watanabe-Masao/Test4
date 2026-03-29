/**
 * StoragePersistencePort — ストレージ永続化・クォータの契約
 *
 * 消費者（useStoragePersistence）が使いたいストレージ操作を定義する。
 * domain 型のみに依存し、infrastructure への依存は持たない。
 */

export type StoragePressureLevel = 'normal' | 'warning' | 'critical'

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
