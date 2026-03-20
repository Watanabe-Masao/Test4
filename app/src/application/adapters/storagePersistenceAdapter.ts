/**
 * StoragePersistenceAdapter — StoragePersistencePort の infrastructure 実装
 */
import {
  requestPersistentStorage,
  isStoragePersisted,
  isOpfsAvailable,
} from '@/infrastructure/storage/storagePersistence'
import { getStorageStatus } from '@/infrastructure/storage/storagePolicy'
import type { StoragePersistencePort } from '@/application/ports/StoragePersistencePort'

export const storagePersistenceAdapter: StoragePersistencePort = {
  requestPersistentStorage,
  isStoragePersisted,
  isOpfsAvailable,
  getStorageStatus,
}
