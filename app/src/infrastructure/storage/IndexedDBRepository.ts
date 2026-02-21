/**
 * Phase 7.2: IndexedDB リポジトリ実装
 *
 * DataRepository インターフェースを IndexedDB で実装する。
 * 既存の IndexedDBStore モジュールの公開 API をそのまま委譲する。
 */
import type { DataRepository, PersistedSessionMeta, MonthDataSummaryItem } from '@/domain/repositories'
import type { ImportedData, DataType } from '@/domain/models'
import {
  saveImportedData,
  loadImportedData,
  saveDataSlice,
  loadMonthlySlice,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  listStoredMonths,
  getMonthDataSummary,
  isIndexedDBAvailable,
} from './IndexedDBStore'

export class IndexedDBRepository implements DataRepository {
  isAvailable(): boolean {
    return isIndexedDBAvailable()
  }

  async saveMonthlyData(data: ImportedData, year: number, month: number): Promise<void> {
    return saveImportedData(data, year, month)
  }

  async loadMonthlyData(year: number, month: number): Promise<ImportedData | null> {
    return loadImportedData(year, month)
  }

  async saveDataSlice(
    data: ImportedData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void> {
    return saveDataSlice(data, year, month, dataTypes)
  }

  async loadDataSlice<T>(year: number, month: number, dataType: string): Promise<T | null> {
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
}

/** シングルトンインスタンス */
export const indexedDBRepository = new IndexedDBRepository()
