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

import type {
  ImportedData,
  StoreDaySummary,
  StoreDaySummaryIndex,
  StoreDaySummaryCache,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, ZERO_COST_INCLUSION_DAILY, indexByStoreDay } from '@/domain/models'
import { aggregateForStore, ZERO_DISCOUNT_ENTRIES } from '@/domain/models'
import { calculateCoreSales } from '@/application/services/grossProfitBridge'
import { hashData } from '@/domain/utilities/hash'

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

/** 移動レコードから8方向のコスト・売価を合計する */
function sumTransferAmounts(
  interInDay:
    | {
        interStoreIn: readonly { cost: number; price: number }[]
        interDepartmentIn: readonly { cost: number; price: number }[]
      }
    | undefined,
  interOutDay:
    | {
        interStoreOut: readonly { cost: number; price: number }[]
        interDepartmentOut: readonly { cost: number; price: number }[]
      }
    | undefined,
) {
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

  return {
    interStoreInCost,
    interStoreInPrice,
    interStoreOutCost,
    interStoreOutPrice,
    interDeptInCost,
    interDeptInPrice,
    interDeptOutCost,
    interDeptOutPrice,
  }
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
  indices: ReturnType<typeof buildIndices>,
): { readonly [day: number]: StoreDaySummary } {
  const purchaseStore = indices.purchase[storeId] ?? {}
  const classifiedSalesAgg = aggregateForStore(data.classifiedSales, storeId)
  const interStoreInStore = indices.interStoreIn[storeId] ?? {}
  const interStoreOutStore = indices.interStoreOut[storeId] ?? {}
  const flowersStore = indices.flowers[storeId] ?? {}
  const directProduceStore = indices.directProduce[storeId] ?? {}
  const costInclusionsStore = indices.consumables[storeId] ?? {}

  const result: Record<number, StoreDaySummary> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const purchaseDay = purchaseStore[day]
    const csDay = classifiedSalesAgg[day]
    const interInDay = interStoreInStore[day]
    const interOutDay = interStoreOutStore[day]
    const flowerDay = flowersStore[day]
    const directProduceDay = directProduceStore[day]
    const costInclusionDay = costInclusionsStore[day]

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
    const {
      interStoreInCost,
      interStoreInPrice,
      interStoreOutCost,
      interStoreOutPrice,
      interDeptInCost,
      interDeptInPrice,
      interDeptOutCost,
      interDeptOutPrice,
    } = sumTransferAmounts(interInDay, interOutDay)

    // 消耗品
    const costInclusionCost = (costInclusionDay ?? ZERO_COST_INCLUSION_DAILY).cost

    // データがない日はスキップ
    const hasSalesData =
      sales > 0 ||
      purchaseCost !== 0 ||
      flowersCost + directProduceCost !== 0 ||
      interStoreInCost !== 0 ||
      interStoreOutCost !== 0 ||
      interDeptInCost !== 0 ||
      interDeptOutCost !== 0 ||
      discountAbsolute !== 0
    const hasData = hasSalesData || costInclusionCost !== 0

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
      costInclusionCost,
      customers,
    }
  }

  return result
}

/** flat record 配列から O(1) ルックアップ用インデックスを一括構築する */
function buildIndices(data: ImportedData) {
  return {
    purchase: indexByStoreDay(data.purchase.records),
    interStoreIn: indexByStoreDay(data.interStoreIn.records),
    interStoreOut: indexByStoreDay(data.interStoreOut.records),
    flowers: indexByStoreDay(data.flowers.records),
    directProduce: indexByStoreDay(data.directProduce.records),
    consumables: indexByStoreDay(data.consumables.records),
  }
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
  const indices = buildIndices(data)

  for (const storeId of data.stores.keys()) {
    const storeDays = buildStoreDay(storeId, data, daysInMonth, indices)
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
