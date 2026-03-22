/**
 * StoragePersistenceAdapter — StoragePersistencePort の infrastructure 実装
 *
 * @guard A1 application/adapters/ 経由で infrastructure にアクセス
 * @see guards/layerBoundaryGuard.test.ts
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
