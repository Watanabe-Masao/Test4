/**
 * ストレージ管理フック（Admin用）
 *
 * DataRepository 経由でのデータ閲覧・管理機能を提供する。
 * presentation 層が infrastructure 層に直接依存しないためのファサード。
 */
import { useCallback, useMemo } from 'react'
import { useRepository } from '../context/RepositoryContext'
import type { SyncResult } from '@/infrastructure/sync/SyncService'

export interface StoredMonthEntry {
  readonly year: number
  readonly month: number
}

export interface MonthDataSummaryEntry {
  readonly dataType: string
  readonly label: string
  readonly recordCount: number
}

/** SyncService を持つリポジトリかどうかの型ガード */
function hasSyncService(repo: unknown): repo is { getSyncService(): { syncFromLocal(year: number, month: number): Promise<SyncResult> } } {
  return (
    typeof repo === 'object' &&
    repo !== null &&
    'getSyncService' in repo &&
    typeof (repo as Record<string, unknown>).getSyncService === 'function'
  )
}

export interface StorageAdminActions {
  /** 保存済み月の一覧を取得 */
  listMonths: () => Promise<StoredMonthEntry[]>
  /** 指定月のデータ種別サマリーを取得 */
  getDataSummary: (year: number, month: number) => Promise<MonthDataSummaryEntry[]>
  /** 指定月のデータを削除 */
  deleteMonth: (year: number, month: number) => Promise<void>
  /** 指定月・データ種別のスライスを取得 */
  loadSlice: <T>(year: number, month: number, dataType: string) => Promise<T | null>
  /** Supabase 同期が可能か */
  isSyncAvailable: boolean
  /** IndexedDB → Supabase に手動同期する */
  syncToSupabase: (year: number, month: number) => Promise<SyncResult>
}

export function useStorageAdmin(): StorageAdminActions {
  const repo = useRepository()

  const listMonths = useCallback(() => repo.listStoredMonths(), [repo])

  const getDataSummary = useCallback(
    (year: number, month: number) => repo.getDataSummary(year, month),
    [repo],
  )

  const deleteMonth = useCallback(
    (year: number, month: number) => repo.clearMonth(year, month),
    [repo],
  )

  const loadSlice = useCallback(
    <T>(year: number, month: number, dataType: string) =>
      repo.loadDataSlice<T>(year, month, dataType),
    [repo],
  )

  const isSyncAvailable = useMemo(() => hasSyncService(repo), [repo])

  const syncToSupabase = useCallback(
    async (year: number, month: number): Promise<SyncResult> => {
      if (!hasSyncService(repo)) {
        return { success: false, syncedTypes: [], failedTypes: [{ dataType: '*', error: 'Supabase is not configured' }] }
      }
      const syncService = repo.getSyncService()
      return syncService.syncFromLocal(year, month)
    },
    [repo],
  )

  return { listMonths, getDataSummary, deleteMonth, loadSlice, isSyncAvailable, syncToSupabase }
}
