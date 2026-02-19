/**
 * 計算オーケストレータ
 *
 * 分割されたモジュールを統合し、公開APIを提供する:
 * - dailyBuilder: 日次レコード構築
 * - storeAssembler: StoreResult組み立て
 * - aggregateResults: 全店集約
 */
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import { buildDailyRecords } from './calculation/dailyBuilder'
import { assembleStoreResult } from './calculation/storeAssembler'
export { aggregateStoreResults } from './calculation/aggregateResults'

/**
 * 店舗別の計算結果を生成する
 */
export function calculateStoreResult(
  storeId: string,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): StoreResult {
  // 取込データ有効末日: dataEndDay が設定されていれば、その日までのデータのみ集計
  const effectiveDays = settings.dataEndDay != null
    ? Math.min(settings.dataEndDay, daysInMonth)
    : daysInMonth
  const acc = buildDailyRecords(storeId, data, effectiveDays)
  return assembleStoreResult(storeId, acc, data, settings, daysInMonth)
}

/**
 * 全店舗の計算結果を生成する
 */
export function calculateAllStores(
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): ReadonlyMap<string, StoreResult> {
  const results = new Map<string, StoreResult>()

  for (const [storeId] of data.stores) {
    results.set(storeId, calculateStoreResult(storeId, data, settings, daysInMonth))
  }

  return results
}
