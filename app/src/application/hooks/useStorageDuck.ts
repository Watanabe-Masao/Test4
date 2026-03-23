/**
 * StorageManagementTab 用 facade hook
 *
 * useDuckDB + useDataRecovery をまとめ、
 * presentation 層が useDuckDB を直接 import しなくて済むようにする。
 *
 * @layer Application — facade hook
 */
import type { ImportedData } from '@/domain/models/storeTypes'
import type { DataRepository } from '@/domain/repositories'
import { useDuckDB } from './useDuckDB'
import { useDataRecovery } from './useDataRecovery'

export function useStorageDuck(
  data: ImportedData,
  targetYear: number,
  targetMonth: number,
  repo: DataRepository,
) {
  const { conn, db } = useDuckDB(data, targetYear, targetMonth, repo)
  return useDataRecovery(conn, db, repo)
}
