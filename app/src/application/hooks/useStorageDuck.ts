/**
 * StorageManagementTab 用 facade hook
 *
 * useDuckDB + useDataRecovery をまとめ、
 * presentation 層が useDuckDB を直接 import しなくて済むようにする。
 *
 * @layer Application — facade hook
 */
import type { DataRepository } from '@/domain/repositories'
import { useDuckDB } from './useDuckDB'
import { useDataRecovery } from './useDataRecovery'

export function useStorageDuck(targetYear: number, targetMonth: number, repo: DataRepository) {
  const { conn, db } = useDuckDB(targetYear, targetMonth, repo)
  return useDataRecovery(conn, db, repo)
}
