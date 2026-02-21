/**
 * ストレージ管理フック（Admin用）
 *
 * IndexedDB のデータ閲覧・管理機能を提供する。
 * presentation 層が infrastructure 層に直接依存しないためのファサード。
 */
import { useCallback } from 'react'
import {
  listStoredMonths,
  getMonthDataSummary,
  clearMonthData,
  loadMonthlySlice,
} from '@/infrastructure/storage/IndexedDBStore'

export interface StoredMonthEntry {
  readonly year: number
  readonly month: number
}

export interface MonthDataSummaryEntry {
  readonly dataType: string
  readonly label: string
  readonly recordCount: number
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
}

export function useStorageAdmin(): StorageAdminActions {
  const listMonths = useCallback(() => listStoredMonths(), [])

  const getDataSummary = useCallback(
    (year: number, month: number) => getMonthDataSummary(year, month),
    [],
  )

  const deleteMonth = useCallback(
    (year: number, month: number) => clearMonthData(year, month),
    [],
  )

  const loadSlice = useCallback(
    <T>(year: number, month: number, dataType: string) =>
      loadMonthlySlice<T>(year, month, dataType),
    [],
  )

  return { listMonths, getDataSummary, deleteMonth, loadSlice }
}
