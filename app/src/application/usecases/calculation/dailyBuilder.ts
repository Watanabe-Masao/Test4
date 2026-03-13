import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  ImportedData,
} from '@/domain/models'
import {
  ZERO_COST_PRICE_PAIR,
  addCostPricePairs,
  ZERO_COST_INCLUSION_DAILY,
  getDailyTotalCost,
  indexByStoreDay,
} from '@/domain/models'
import { aggregateForStore, ZERO_DISCOUNT_ENTRIES, addDiscountEntries } from '@/domain/models'
import { calculateCoreSales } from '@/domain/calculations/estMethod'
import type { MonthlyAccumulator } from './types'
import { buildTransferBreakdown, aggregateSupplierDay } from './dailyBuilderHelpers'

/**
 * 店舗の日別レコードを構築し、月間集計を蓄積する
 */
export function buildDailyRecords(
  storeId: string,
  data: ImportedData,
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

  let totalSales = 0
  let totalCost = 0
  let totalFlowerPrice = 0
  let totalFlowerCost = 0
  let totalDirectProducePrice = 0
  let totalDirectProduceCost = 0
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  let totalDiscount = 0
  let totalDiscountEntries = ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e }))
  let totalCostInclusion = 0
  let totalCustomers = 0
  let salesDays = 0
  let elapsedDays = 0
  let purchaseMaxDay = 0
  let hasDiscountData = false

  const transferTotals = {
    interStoreIn: { ...ZERO_COST_PRICE_PAIR },
    interStoreOut: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentIn: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentOut: { ...ZERO_COST_PRICE_PAIR },
  }

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
      : ZERO_COST_PRICE_PAIR
    if (purchaseDay) purchaseMaxDay = day

    // 売上（分類別売上の集約）・客数（花ファイル）
    const daySales = csDay?.sales ?? 0
    const dayCustomers = flowerDay?.customers ?? 0

    // 花・産直
    const flowers: CostPricePair = flowerDay
      ? { cost: flowerDay.cost, price: flowerDay.price }
      : ZERO_COST_PRICE_PAIR
    const directProduce: CostPricePair = directProduceDay
      ? { cost: directProduceDay.cost, price: directProduceDay.price }
      : ZERO_COST_PRICE_PAIR

    // 売上納品 = 花 + 産直
    const deliverySales = addCostPricePairs(flowers, directProduce)

    // 移動内訳（店間・部門間の入出）
    const transfer = buildTransferBreakdown(interInDay, interOutDay)
    const { interStoreIn, interStoreOut, interDepartmentIn, interDepartmentOut } = transfer

    // 消耗品
    const costInclusion = costInclusionDay ?? ZERO_COST_INCLUSION_DAILY

    // 売変（分類別売上の集約 — 種別内訳つき）
    const discountEntries = csDay?.discountEntries ?? ZERO_DISCOUNT_ENTRIES
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

    // 月間集計
    totalSales += daySales
    totalPurchaseCost += purchase.cost
    totalPurchasePrice += purchase.price
    totalFlowerPrice += flowers.price
    totalFlowerCost += flowers.cost
    totalDirectProducePrice += directProduce.price
    totalDirectProduceCost += directProduce.cost
    totalDiscount += discountAbsolute
    totalDiscountEntries = addDiscountEntries(
      totalDiscountEntries,
      discountEntries,
    ) as typeof totalDiscountEntries
    totalCostInclusion += costInclusion.cost
    totalCustomers += dayCustomers

    // 移動集計
    transferTotals.interStoreIn = addCostPricePairs(transferTotals.interStoreIn, interStoreIn)
    transferTotals.interStoreOut = addCostPricePairs(transferTotals.interStoreOut, interStoreOut)
    transferTotals.interDepartmentIn = addCostPricePairs(
      transferTotals.interDepartmentIn,
      interDepartmentIn,
    )
    transferTotals.interDepartmentOut = addCostPricePairs(
      transferTotals.interDepartmentOut,
      interDepartmentOut,
    )
  }

  return {
    daily,
    categoryTotals,
    supplierTotals,
    totalSales,
    totalCost,
    totalFlowerPrice,
    totalFlowerCost,
    totalDirectProducePrice,
    totalDirectProduceCost,
    totalPurchaseCost,
    totalPurchasePrice,
    totalDiscount,
    totalDiscountEntries,
    totalCostInclusion,
    totalCustomers,
    salesDays,
    elapsedDays,
    purchaseMaxDay,
    hasDiscountData,
    transferTotals,
  }
}
