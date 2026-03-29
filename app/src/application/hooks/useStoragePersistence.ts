/**
 * ストレージ永続化フック
 *
 * infrastructure/storage/storagePersistence.ts と storagePolicy.ts を
 * Application 層にブリッジし、UI からストレージ状態の確認・永続化要求を可能にする。
 */
import { useState, useEffect, useCallback } from 'react'
import { useStoragePersistenceAdapter } from '@/application/context/useAdapters'
import type { StoragePressureLevel } from '@/domain/ports/StoragePersistencePort'

export interface StorageStatusInfo {
  readonly isPersisted: boolean
  readonly usageBytes: number
  readonly quotaBytes: number
  readonly usageRatio: number
  readonly usageFormatted: string
  readonly quotaFormatted: string
  readonly pressureLevel: StoragePressureLevel
  readonly isOpfsAvailable: boolean
}

const INITIAL_STATUS: StorageStatusInfo = {
  isPersisted: false,
  usageBytes: 0,
  quotaBytes: 0,
  usageRatio: 0,
  usageFormatted: 'N/A',
  quotaFormatted: 'N/A',
  pressureLevel: 'normal',
  isOpfsAvailable: false,
}

export function useStoragePersistence(): {
  status: StorageStatusInfo
  isLoading: boolean
  requestPersistence: () => Promise<boolean>
  refresh: () => Promise<void>
} {
  const storagePersistenceAdapter = useStoragePersistenceAdapter()
  const [status, setStatus] = useState<StorageStatusInfo>(INITIAL_STATUS)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [persisted, opfs, storageStatus] = await Promise.all([
        storagePersistenceAdapter.isStoragePersisted(),
        storagePersistenceAdapter.isOpfsAvailable(),
        storagePersistenceAdapter.getStorageStatus(),
      ])

      setStatus({
        isPersisted: persisted,
        usageBytes: storageStatus.estimate?.usage ?? 0,
        quotaBytes: storageStatus.estimate?.quota ?? 0,
        usageRatio: storageStatus.estimate?.usageRatio ?? 0,
        usageFormatted: storageStatus.usageFormatted,
        quotaFormatted: storageStatus.quotaFormatted,
        pressureLevel: storageStatus.level,
        isOpfsAvailable: opfs,
      })
    } catch {
      // ブラウザ API 非対応時はデフォルト値のまま
    } finally {
      setIsLoading(false)
    }
  }, [storagePersistenceAdapter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleRequestPersistence = useCallback(async (): Promise<boolean> => {
    const granted = await storagePersistenceAdapter.requestPersistentStorage()
    await refresh()
    return granted
  }, [storagePersistenceAdapter, refresh])

  return {
    status,
    isLoading,
    requestPersistence: handleRequestPersistence,
    refresh,
  }
}
