/**
 * StoreDaySummary ビルダー
 *
 * ImportedData（分離ソース）から StoreDaySummaryIndex（結合済み参照データ）を構築する。
 * dailyBuilder.ts と同じ結合ロジックを使用するが、出力はフラットな
 * JSON シリアライズ可能構造（Map/Set を使わない）。
 *
 * 設計原則:
 * - ソースデータは変更しない（読み取り専用）
 * - 出力は StoreDaySummaryIndex（storeId → day → StoreDaySummary）
 * - フィンガープリントでキャッシュ無効化を判定
 * - 詳細明細（supplierBreakdown, transferBreakdown）は含めない
 */

import type { ImportedData, StoreDaySummary, StoreDaySummaryIndex, StoreDaySummaryCache } from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, ZERO_CONSUMABLE_DAILY } from '@/domain/models'
import { aggregateForStore, ZERO_DISCOUNT_ENTRIES } from '@/domain/models'
import { calculateCoreSales } from '@/domain/calculations/estMethod'
import { hashData } from '@/application/services/murmurhash'

/**
 * ソースデータのフィンガープリントを計算する。
 * StoreDaySummary の構築に影響するデータのみをハッシュ対象とする。
 * （categoryTimeSales, departmentKpi, settings, budget は含まない
 *   — これらは StoreDaySummary の構築に使われないため）
 */
export function computeSummaryFingerprint(data: ImportedData): string {
  const input = {
    csRecordCount: data.classifiedSales.records.length,
    // classifiedSales の全レコードキーをハッシュするのは高コストなので、
    // レコード数 + 先頭・末尾レコード + 全店舗IDの組み合わせで近似
    csFirst: data.classifiedSales.records[0],
    csLast: data.classifiedSales.records[data.classifiedSales.records.length - 1],
    storeIds: Array.from(data.stores.keys()).sort(),
    purchase: data.purchase,
    interStoreIn: data.interStoreIn,
    interStoreOut: data.interStoreOut,
    flowers: data.flowers,
    directProduce: data.directProduce,
    consumables: data.consumables,
  }
  const hash = hashData(input)
  return `sds:${hash.toString(36)}`
}

/**
 * 単一店舗の日別サマリーを構築する。
 * dailyBuilder.buildDailyRecords の結合ロジックを抽出し、
 * フラットな StoreDaySummary を生成する。
 */
function buildStoreDay(
  storeId: string,
  data: ImportedData,
  daysInMonth: number,
): { readonly [day: number]: StoreDaySummary } {
  const purchaseStore = data.purchase[storeId] ?? {}
  const classifiedSalesAgg = aggregateForStore(data.classifiedSales, storeId)
  const interStoreInStore = data.interStoreIn[storeId] ?? {}
  const interStoreOutStore = data.interStoreOut[storeId] ?? {}
  const flowersStore = data.flowers[storeId] ?? {}
  const directProduceStore = data.directProduce[storeId] ?? {}
  const consumablesStore = data.consumables[storeId] ?? {}

  const result: Record<number, StoreDaySummary> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const purchaseDay = purchaseStore[day]
    const csDay = classifiedSalesAgg[day]
    const interInDay = interStoreInStore[day]
    const interOutDay = interStoreOutStore[day]
    const flowerDay = flowersStore[day]
    const directProduceDay = directProduceStore[day]
    const consumableDay = consumablesStore[day]

    // 仕入
    const purchaseCost = purchaseDay ? purchaseDay.total.cost : 0
    const purchasePrice = purchaseDay ? purchaseDay.total.price : 0

    // 売上・売変
    const sales = csDay?.sales ?? 0
    const discountEntries = csDay?.discountEntries ?? ZERO_DISCOUNT_ENTRIES
    const discountAmount = csDay?.discount ?? 0
    const discountAbsolute = Math.abs(discountAmount)

    // 客数（花ファイル由来）
    const customers = flowerDay?.customers ?? 0

    // 花・産直
    const flowersCost = flowerDay?.cost ?? ZERO_COST_PRICE_PAIR.cost
    const flowersPrice = flowerDay?.price ?? ZERO_COST_PRICE_PAIR.price
    const directProduceCost = directProduceDay?.cost ?? ZERO_COST_PRICE_PAIR.cost
    const directProducePrice = directProduceDay?.price ?? ZERO_COST_PRICE_PAIR.price

    // 移動
    let interStoreInCost = 0
    let interStoreInPrice = 0
    let interStoreOutCost = 0
    let interStoreOutPrice = 0
    let interDeptInCost = 0
    let interDeptInPrice = 0
    let interDeptOutCost = 0
    let interDeptOutPrice = 0

    if (interInDay) {
      for (const r of interInDay.interStoreIn) {
        interStoreInCost += r.cost
        interStoreInPrice += r.price
      }
      for (const r of interInDay.interDepartmentIn) {
        interDeptInCost += r.cost
        interDeptInPrice += r.price
      }
    }
    if (interOutDay) {
      for (const r of interOutDay.interStoreOut) {
        interStoreOutCost += r.cost
        interStoreOutPrice += r.price
      }
      for (const r of interOutDay.interDepartmentOut) {
        interDeptOutCost += r.cost
        interDeptOutPrice += r.price
      }
    }

    // 消耗品
    const consumableCost = (consumableDay ?? ZERO_CONSUMABLE_DAILY).cost

    // データがない日はスキップ
    const hasSalesData =
      sales > 0 ||
      purchaseCost !== 0 ||
      (flowersCost + directProduceCost) !== 0 ||
      interStoreInCost !== 0 ||
      interStoreOutCost !== 0 ||
      interDeptInCost !== 0 ||
      interDeptOutCost !== 0 ||
      discountAbsolute !== 0
    const hasData = hasSalesData || consumableCost !== 0

    if (!hasData) continue

    // コア売上
    const { coreSales } = calculateCoreSales(sales, flowersPrice, directProducePrice)
    // 粗売上 = 売上 + 売変額
    const grossSales = sales + discountAbsolute

    result[day] = {
      day,
      sales,
      coreSales,
      grossSales,
      discountAmount,
      discountAbsolute,
      discountEntries,
      purchaseCost,
      purchasePrice,
      interStoreInCost,
      interStoreInPrice,
      interStoreOutCost,
      interStoreOutPrice,
      interDeptInCost,
      interDeptInPrice,
      interDeptOutCost,
      interDeptOutPrice,
      flowersCost,
      flowersPrice,
      directProduceCost,
      directProducePrice,
      consumableCost,
      customers,
    }
  }

  return result
}

/**
 * ImportedData から StoreDaySummaryIndex を構築する。
 * 全店舗分のサマリーを生成する。
 */
export function buildStoreDaySummaryIndex(
  data: ImportedData,
  daysInMonth: number,
): StoreDaySummaryIndex {
  const result: Record<string, { readonly [day: number]: StoreDaySummary }> = {}

  for (const storeId of data.stores.keys()) {
    const storeDays = buildStoreDay(storeId, data, daysInMonth)
    // 空の店舗もキーとして含める（存在証明）
    result[storeId] = storeDays
  }

  return result
}

/**
 * StoreDaySummaryCache を構築する。
 * フィンガープリント付きのキャッシュエンベロープを返す。
 */
export function buildStoreDaySummaryCache(
  data: ImportedData,
  daysInMonth: number,
): StoreDaySummaryCache {
  return {
    sourceFingerprint: computeSummaryFingerprint(data),
    builtAt: new Date().toISOString(),
    summaries: buildStoreDaySummaryIndex(data, daysInMonth),
  }
}
