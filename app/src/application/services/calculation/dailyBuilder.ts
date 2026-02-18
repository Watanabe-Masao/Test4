import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  TransferBreakdownEntry,
  ImportedData,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs, ZERO_CONSUMABLE_DAILY, getDailyTotalCost } from '@/domain/models'
import { calculateCoreSales } from '@/domain/calculations/estMethod'
import type { MonthlyAccumulator } from './types'

/**
 * 店舗の日別レコードを構築し、月間集計を蓄積する
 */
export function buildDailyRecords(
  storeId: string,
  data: ImportedData,
  daysInMonth: number,
): MonthlyAccumulator {
  const purchaseStore = data.purchase[storeId] ?? {}
  const salesStore = data.sales[storeId] ?? {}
  const discountStore = data.discount[storeId] ?? {}
  const interStoreInStore = data.interStoreIn[storeId] ?? {}
  const interStoreOutStore = data.interStoreOut[storeId] ?? {}
  const flowersStore = data.flowers[storeId] ?? {}
  const directProduceStore = data.directProduce[storeId] ?? {}
  const consumablesStore = data.consumables[storeId] ?? {}

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
  let totalConsumable = 0
  let salesDays = 0
  let elapsedDays = 0

  const transferTotals = {
    interStoreIn: { ...ZERO_COST_PRICE_PAIR },
    interStoreOut: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentIn: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentOut: { ...ZERO_COST_PRICE_PAIR },
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const purchaseDay = purchaseStore[day]
    const salesDay = salesStore[day]
    const discountDay = discountStore[day]
    const interInDay = interStoreInStore[day]
    const interOutDay = interStoreOutStore[day]
    const flowerDay = flowersStore[day]
    const directProduceDay = directProduceStore[day]
    const consumableDay = consumablesStore[day]

    // 仕入
    const purchase: CostPricePair = purchaseDay
      ? { cost: purchaseDay.total.cost, price: purchaseDay.total.price }
      : ZERO_COST_PRICE_PAIR

    // 売上
    const daySales = salesDay?.sales ?? 0

    // 花・産直
    const flowers: CostPricePair = flowerDay
      ? { cost: flowerDay.cost, price: flowerDay.price }
      : ZERO_COST_PRICE_PAIR
    const directProduce: CostPricePair = directProduceDay
      ? { cost: directProduceDay.cost, price: directProduceDay.price }
      : ZERO_COST_PRICE_PAIR

    // 売上納品 = 花 + 産直
    const deliverySales = addCostPricePairs(flowers, directProduce)

    // 店間移動
    let interStoreIn = ZERO_COST_PRICE_PAIR
    let interStoreOut = ZERO_COST_PRICE_PAIR
    let interDepartmentIn = ZERO_COST_PRICE_PAIR
    let interDepartmentOut = ZERO_COST_PRICE_PAIR

    // 移動明細（from→to別）
    const tbInterStoreIn: TransferBreakdownEntry[] = []
    const tbInterStoreOut: TransferBreakdownEntry[] = []
    const tbInterDepartmentIn: TransferBreakdownEntry[] = []
    const tbInterDepartmentOut: TransferBreakdownEntry[] = []

    if (interInDay) {
      interStoreIn = interInDay.interStoreIn.reduce(
        (acc, r) => ({ cost: acc.cost + r.cost, price: acc.price + r.price }),
        { ...ZERO_COST_PRICE_PAIR },
      )
      interDepartmentIn = interInDay.interDepartmentIn.reduce(
        (acc, r) => ({ cost: acc.cost + r.cost, price: acc.price + r.price }),
        { ...ZERO_COST_PRICE_PAIR },
      )
      for (const r of interInDay.interStoreIn) {
        tbInterStoreIn.push({ fromStoreId: r.fromStoreId, toStoreId: r.toStoreId, cost: r.cost, price: r.price })
      }
      for (const r of interInDay.interDepartmentIn) {
        tbInterDepartmentIn.push({ fromStoreId: r.fromStoreId, toStoreId: r.toStoreId, cost: r.cost, price: r.price })
      }
    }

    if (interOutDay) {
      interStoreOut = interOutDay.interStoreOut.reduce(
        (acc, r) => ({ cost: acc.cost + r.cost, price: acc.price + r.price }),
        { ...ZERO_COST_PRICE_PAIR },
      )
      interDepartmentOut = interOutDay.interDepartmentOut.reduce(
        (acc, r) => ({ cost: acc.cost + r.cost, price: acc.price + r.price }),
        { ...ZERO_COST_PRICE_PAIR },
      )
      for (const r of interOutDay.interStoreOut) {
        tbInterStoreOut.push({ fromStoreId: r.fromStoreId, toStoreId: r.toStoreId, cost: r.cost, price: r.price })
      }
      for (const r of interOutDay.interDepartmentOut) {
        tbInterDepartmentOut.push({ fromStoreId: r.fromStoreId, toStoreId: r.toStoreId, cost: r.cost, price: r.price })
      }
    }

    // 消耗品
    const consumable = consumableDay ?? ZERO_CONSUMABLE_DAILY

    // 売変
    const discountAmount = discountDay?.discount ?? 0
    const discountAbsolute = Math.abs(discountAmount)

    // コア売上
    const { coreSales } = calculateCoreSales(daySales, flowers.price, directProduce.price)

    // 粗売上 = 売上 + 売変額
    const grossSales = daySales + discountAbsolute

    // 取引先別内訳
    const supplierBreakdown = new Map<string, CostPricePair>()
    if (purchaseDay) {
      for (const [code, sup] of Object.entries(purchaseDay.suppliers)) {
        supplierBreakdown.set(code, { cost: sup.cost, price: sup.price })

        if (!supplierTotals.has(code)) {
          supplierTotals.set(code, {
            supplierCode: code,
            supplierName: sup.name,
            category: 'other' as import('@/domain/models').CategoryType,
            cost: 0,
            price: 0,
            markupRate: 0,
          })
        }
        const st = supplierTotals.get(code)
        if (st) {
          supplierTotals.set(code, {
            ...st,
            cost: st.cost + sup.cost,
            price: st.price + sup.price,
          })
        }
      }
    }

    // 日別レコード生成（データがある日のみ）
    const hasData =
      daySales > 0 ||
      purchase.cost !== 0 ||
      deliverySales.cost !== 0 ||
      interStoreIn.cost !== 0 ||
      interStoreOut.cost !== 0 ||
      interDepartmentIn.cost !== 0 ||
      interDepartmentOut.cost !== 0 ||
      discountAbsolute !== 0 ||
      consumable.cost !== 0

    if (hasData) {
      elapsedDays = day
      if (daySales > 0) salesDays++

      const rec: DailyRecord = {
        day,
        sales: daySales,
        coreSales,
        grossSales,
        purchase,
        deliverySales,
        interStoreIn,
        interStoreOut,
        interDepartmentIn,
        interDepartmentOut,
        flowers,
        directProduce,
        consumable,
        discountAmount,
        discountAbsolute,
        supplierBreakdown,
        transferBreakdown: {
          interStoreIn: tbInterStoreIn,
          interStoreOut: tbInterStoreOut,
          interDepartmentIn: tbInterDepartmentIn,
          interDepartmentOut: tbInterDepartmentOut,
        },
      }
      daily.set(day, rec)
      totalCost += getDailyTotalCost(rec)
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
    totalConsumable += consumable.cost

    // 移動集計
    transferTotals.interStoreIn = addCostPricePairs(transferTotals.interStoreIn, interStoreIn)
    transferTotals.interStoreOut = addCostPricePairs(transferTotals.interStoreOut, interStoreOut)
    transferTotals.interDepartmentIn = addCostPricePairs(transferTotals.interDepartmentIn, interDepartmentIn)
    transferTotals.interDepartmentOut = addCostPricePairs(transferTotals.interDepartmentOut, interDepartmentOut)
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
    totalConsumable,
    salesDays,
    elapsedDays,
    transferTotals,
  }
}
