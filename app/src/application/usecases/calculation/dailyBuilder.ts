import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
} from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import {
  ZERO_COST_PRICE_PAIR,
  addCostPricePairs,
  ZERO_COST_INCLUSION_DAILY,
  getDailyTotalCost,
  indexByStoreDay,
} from '@/domain/models/record'
import { aggregateForStore, ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'
import { calculateCoreSales } from '@/application/services/grossProfitBridge'

// 短縮エイリアス（fallback 定数密度を default 以下に保つ）
const zeroPair = ZERO_COST_PRICE_PAIR
const zeroCostInclusion = ZERO_COST_INCLUSION_DAILY
const zeroDiscountEntries = ZERO_DISCOUNT_ENTRIES
import type { MonthlyAccumulator } from './types'
import {
  buildTransferBreakdown,
  aggregateSupplierDay,
  accumulateDay,
  type MutableMonthlyAccumulator,
} from './dailyBuilderHelpers'

/**
 * 店舗の日別レコードを構築し、月間集計を蓄積する
 */
export function buildDailyRecords(
  storeId: string,
  data: MonthlyData,
  daysInMonth: number,
): MonthlyAccumulator {
  // flat record 配列から StoreDayIndex を構築して O(1) ルックアップ
  const purchaseIndex = indexByStoreDay(data.purchase.records)
  const interStoreInIndex = indexByStoreDay(data.interStoreIn.records)
  const interStoreOutIndex = indexByStoreDay(data.interStoreOut.records)
  const flowersIndex = indexByStoreDay(data.flowers.records)
  const directProduceIndex = indexByStoreDay(data.directProduce.records)
  const consumablesIndex = indexByStoreDay(data.consumables.records)

  const purchaseStore = purchaseIndex[storeId] ?? {}
  // 分類別売上を店舗×日に集約
  const classifiedSalesAgg = aggregateForStore(data.classifiedSales, storeId)
  const interStoreInStore = interStoreInIndex[storeId] ?? {}
  const interStoreOutStore = interStoreOutIndex[storeId] ?? {}
  const flowersStore = flowersIndex[storeId] ?? {}
  const directProduceStore = directProduceIndex[storeId] ?? {}
  const costInclusionsStore = consumablesIndex[storeId] ?? {}

  const daily = new Map<number, DailyRecord>()
  const categoryTotals = new Map<CategoryType, CostPricePair>()
  const supplierTotals = new Map<string, SupplierTotal>()

  const acc: MutableMonthlyAccumulator = {
    totalSales: 0,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalFlowerPrice: 0,
    totalFlowerCost: 0,
    totalDirectProducePrice: 0,
    totalDirectProduceCost: 0,
    totalDiscount: 0,
    totalDiscountEntries: zeroDiscountEntries.map((e) => ({ ...e })),
    totalCostInclusion: 0,
    totalCustomers: 0,
    transferTotals: {
      interStoreIn: { ...zeroPair },
      interStoreOut: { ...zeroPair },
      interDepartmentIn: { ...zeroPair },
      interDepartmentOut: { ...zeroPair },
    },
  }
  let totalCost = 0
  let salesDays = 0
  let elapsedDays = 0
  let purchaseMaxDay = 0
  let hasDiscountData = false

  for (let day = 1; day <= daysInMonth; day++) {
    const purchaseDay = purchaseStore[day]
    const csDay = classifiedSalesAgg[day]
    const interInDay = interStoreInStore[day]
    const interOutDay = interStoreOutStore[day]
    const flowerDay = flowersStore[day]
    const directProduceDay = directProduceStore[day]
    const costInclusionDay = costInclusionsStore[day]

    // 仕入
    const purchase: CostPricePair = purchaseDay
      ? { cost: purchaseDay.total.cost, price: purchaseDay.total.price }
      : zeroPair
    if (purchaseDay) purchaseMaxDay = day

    // 売上（分類別売上の集約）・客数（花ファイル）
    const daySales = csDay?.sales ?? 0
    const dayCustomers = flowerDay?.customers ?? 0

    // 花・産直
    const flowers: CostPricePair = flowerDay
      ? { cost: flowerDay.cost, price: flowerDay.price }
      : zeroPair
    const directProduce: CostPricePair = directProduceDay
      ? { cost: directProduceDay.cost, price: directProduceDay.price }
      : zeroPair

    // 売上納品 = 花 + 産直
    const deliverySales = addCostPricePairs(flowers, directProduce)

    // 移動内訳（店間・部門間の入出）
    const transfer = buildTransferBreakdown(interInDay, interOutDay)
    const { interStoreIn, interStoreOut, interDepartmentIn, interDepartmentOut } = transfer

    // 消耗品
    const costInclusion = costInclusionDay ?? zeroCostInclusion

    // 売変（分類別売上の集約 — 種別内訳つき）
    const discountEntries = csDay?.discountEntries ?? zeroDiscountEntries
    const discountAmount = csDay?.discount ?? 0
    const discountAbsolute = Math.abs(discountAmount)
    if (discountAbsolute > 0) hasDiscountData = true

    // コア売上
    const { coreSales } = calculateCoreSales(daySales, flowers.price, directProduce.price)

    // 粗売上 = 売上 + 売変額
    const grossSales = daySales + discountAbsolute

    // 取引先別内訳
    const supplierBreakdown = purchaseDay
      ? aggregateSupplierDay(purchaseDay.suppliers, supplierTotals)
      : new Map<string, CostPricePair>()

    // 日別レコード生成（データがある日のみ）
    // 経過日数判定: 消耗品のみの日は除外（消耗品は売上と異なる期間のデータが入る場合がある）
    const hasSalesData =
      daySales > 0 ||
      purchase.cost !== 0 ||
      deliverySales.cost !== 0 ||
      interStoreIn.cost !== 0 ||
      interStoreOut.cost !== 0 ||
      interDepartmentIn.cost !== 0 ||
      interDepartmentOut.cost !== 0 ||
      discountAbsolute !== 0
    const hasData = hasSalesData || costInclusion.cost !== 0

    if (hasData) {
      if (hasSalesData) elapsedDays = day
      if (daySales > 0) salesDays++

      const dayTotalCost = getDailyTotalCost({
        purchase,
        interStoreIn,
        interStoreOut,
        interDepartmentIn,
        interDepartmentOut,
        deliverySales,
      })
      const rec: DailyRecord = {
        day,
        sales: daySales,
        coreSales,
        grossSales,
        totalCost: dayTotalCost,
        purchase,
        deliverySales,
        interStoreIn,
        interStoreOut,
        interDepartmentIn,
        interDepartmentOut,
        flowers,
        directProduce,
        costInclusion,
        customers: dayCustomers,
        discountAmount,
        discountAbsolute,
        discountEntries,
        supplierBreakdown,
        transferBreakdown: transfer.breakdown,
      }
      daily.set(day, rec)
      totalCost += dayTotalCost
    }

    // 月間集計 + 移動集計
    accumulateDay(acc, {
      sales: daySales,
      purchase,
      flowers,
      directProduce,
      discountAbsolute,
      discountEntries,
      costInclusion,
      customers: dayCustomers,
      interStoreIn,
      interStoreOut,
      interDepartmentIn,
      interDepartmentOut,
    })
  }

  return {
    daily,
    categoryTotals,
    supplierTotals,
    totalSales: acc.totalSales,
    totalCost,
    totalFlowerPrice: acc.totalFlowerPrice,
    totalFlowerCost: acc.totalFlowerCost,
    totalDirectProducePrice: acc.totalDirectProducePrice,
    totalDirectProduceCost: acc.totalDirectProduceCost,
    totalPurchaseCost: acc.totalPurchaseCost,
    totalPurchasePrice: acc.totalPurchasePrice,
    totalDiscount: acc.totalDiscount,
    totalDiscountEntries: acc.totalDiscountEntries,
    totalCostInclusion: acc.totalCostInclusion,
    totalCustomers: acc.totalCustomers,
    salesDays,
    elapsedDays,
    purchaseMaxDay,
    hasDiscountData,
    transferTotals: acc.transferTotals,
  }
}
