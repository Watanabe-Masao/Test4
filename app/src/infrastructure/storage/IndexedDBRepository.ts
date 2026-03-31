/**
 * Phase 7.2: IndexedDB リポジトリ実装
 *
 * DataRepository インターフェースを IndexedDB で実装する。
 * 既存の IndexedDBStore モジュールの公開 API をそのまま委譲する。
 */
import type {
  DataRepository,
  PersistedSessionMeta,
  MonthDataSummaryItem,
} from '@/domain/repositories'
import type { ImportHistoryEntry } from '@/domain/models/analysis'
import type { StoreDaySummaryCache } from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DataType, StorageDataType } from '@/domain/models/storeTypes'
import { toLegacyImportedData, toMonthlyData } from '@/domain/models/monthlyDataAdapter'
import {
  saveImportedData,
  loadImportedData,
  saveDataSlice as saveDataSliceInternal,
  loadMonthlySlice,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  listStoredMonths,
  getMonthDataSummary,
  isIndexedDBAvailable,
  saveImportHistory,
  loadImportHistory,
  saveStoreDaySummaryCache,
  loadStoreDaySummaryCache,
} from './IndexedDBStore'

export class IndexedDBRepository implements DataRepository {
  isAvailable(): boolean {
    return isIndexedDBAvailable()
  }

  async saveMonthlyData(data: MonthlyData, year: number, month: number): Promise<void> {
    // 内部 storage は ImportedData ベース — adapter で互換変換（Phase 2 完了まで維持）
    const legacy = toLegacyImportedData({ current: data, prevYear: null })
    return saveImportedData(legacy, year, month)
  }

  async loadMonthlyData(year: number, month: number): Promise<MonthlyData | null> {
    const legacy = await loadImportedData(year, month)
    if (!legacy) return null
    return toMonthlyData(legacy, { year, month, importedAt: new Date().toISOString() })
  }

  async saveDataSlice(
    data: MonthlyData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void> {
    const legacy = toLegacyImportedData({ current: data, prevYear: null })
    return saveDataSliceInternal(legacy, year, month, dataTypes)
  }

  async loadDataSlice<T>(
    year: number,
    month: number,
    dataType: StorageDataType,
  ): Promise<T | null> {
    return loadMonthlySlice<T>(year, month, dataType)
  }

  async getSessionMeta(): Promise<PersistedSessionMeta | null> {
    return getPersistedMeta()
  }

  async clearMonth(year: number, month: number): Promise<void> {
    return clearMonthData(year, month)
  }

  async clearAll(): Promise<void> {
    return clearAllData()
  }

  async listStoredMonths(): Promise<{ year: number; month: number }[]> {
    return listStoredMonths()
  }

  async getDataSummary(year: number, month: number): Promise<MonthDataSummaryItem[]> {
    return getMonthDataSummary(year, month)
  }

  async saveImportHistory(year: number, month: number, entry: ImportHistoryEntry): Promise<void> {
    return saveImportHistory(year, month, entry)
  }

  async loadImportHistory(year: number, month: number): Promise<ImportHistoryEntry[]> {
    return loadImportHistory(year, month)
  }

  async saveSummaryCache(cache: StoreDaySummaryCache, year: number, month: number): Promise<void> {
    return saveStoreDaySummaryCache(cache, year, month)
  }

  async loadSummaryCache(year: number, month: number): Promise<StoreDaySummaryCache | null> {
    return loadStoreDaySummaryCache(year, month)
  }
}

/** シングルトンインスタンス */
export const indexedDBRepository = new IndexedDBRepository()
