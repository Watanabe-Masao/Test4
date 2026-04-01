/**
 * 計算ユースケース
 *
 * 分割されたモジュールを統合し、公開APIを提供する:
 * - dailyBuilder: 日次レコード構築
 * - storeAssembler: StoreResult組み立て
 * - aggregateResults: 全店集約
 */
import type { AppSettings, StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'
import { buildDailyRecords } from './dailyBuilder'
import { assembleStoreResult } from './storeAssembler'
export { aggregateStoreResults } from './aggregateResults'

/**
 * 店舗別の計算結果を生成する
 */
export function calculateStoreResult(
  storeId: string,
  data: MonthlyData,
  settings: AppSettings,
  frame: CalculationFrame,
): StoreResult {
  const acc = buildDailyRecords(storeId, data, frame.effectiveDays)
  return assembleStoreResult(storeId, acc, data, settings, frame.daysInMonth)
}

/**
 * 全店舗の計算結果を生成する
 */
export function calculateAllStores(
  data: MonthlyData,
  settings: AppSettings,
  frame: CalculationFrame,
): ReadonlyMap<string, StoreResult> {
  const results = new Map<string, StoreResult>()

  for (const [storeId] of data.stores) {
    results.set(storeId, calculateStoreResult(storeId, data, settings, frame))
  }

  return results
}
