/**
 * 計算ユースケース
 *
 * 分割されたモジュールを統合し、公開APIを提供する:
 * - dailyBuilder: 日次レコード構築
 * - storeAssembler: StoreResult組み立て
 * - aggregateResults: 全店集約
 */
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import { buildDailyRecords } from './dailyBuilder'
import { assembleStoreResult } from './storeAssembler'
export { aggregateStoreResults } from './aggregateResults'

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

  // 診断ログ: classifiedSales の状態を出力
  const csRecords = data.classifiedSales.records
  const csStoreIds = new Set(csRecords.map((r) => r.storeId))
  const storeKeys = Array.from(data.stores.keys())
  console.info('[CalcOrchestrator] classifiedSales records:', csRecords.length)
  console.info('[CalcOrchestrator] classifiedSales storeIds:', Array.from(csStoreIds))
  console.info('[CalcOrchestrator] data.stores keys:', storeKeys)
  console.info('[CalcOrchestrator] purchase storeIds:', Object.keys(data.purchase))
  if (csRecords.length > 0) {
    const sample = csRecords[0]
    console.info('[CalcOrchestrator] sample record:', {
      year: sample.year, month: sample.month, day: sample.day,
      storeId: sample.storeId, salesAmount: sample.salesAmount,
    })
  }
  // storeId の一致チェック
  for (const sid of storeKeys) {
    const matchCount = csRecords.filter((r) => r.storeId === sid).length
    if (matchCount === 0) {
      console.warn(`[CalcOrchestrator] storeId "${sid}" has 0 classifiedSales records`)
    }
  }

  for (const [storeId] of data.stores) {
    results.set(storeId, calculateStoreResult(storeId, data, settings, daysInMonth))
  }

  return results
}
