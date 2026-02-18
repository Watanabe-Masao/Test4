import type {
  AppSettings,
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  StoreResult,
  TransferDetails,
  TransferBreakdownEntry,
  ImportedData,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs, ZERO_CONSUMABLE_DAILY, getDailyTotalCost } from '@/domain/models'
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import {
  calculateEstMethod,
  calculateCoreSales,
  calculateDiscountRate,
} from '@/domain/calculations/estMethod'
import { calculateDiscountImpact } from '@/domain/calculations/discountImpact'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import { safeDivide } from '@/domain/calculations/utils'

// ─── Internal types ───────────────────────────────────────

/** 日別ループで蓄積される月間集計 */
interface MonthlyAccumulator {
  daily: Map<number, DailyRecord>
  categoryTotals: Map<CategoryType, CostPricePair>
  supplierTotals: Map<string, SupplierTotal>
  totalSales: number
  totalCost: number
  totalFlowerPrice: number
  totalFlowerCost: number
  totalDirectProducePrice: number
  totalDirectProduceCost: number
  totalPurchaseCost: number
  totalPurchasePrice: number
  totalDiscount: number
  totalConsumable: number
  salesDays: number
  elapsedDays: number
  transferTotals: {
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  }
}

// ─── Daily record builder ─────────────────────────────────

/**
 * 店舗の日別レコードを構築し、月間集計を蓄積する
 */
function buildDailyRecords(
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
            category: 'other' as CategoryType,
            cost: 0,
            price: 0,
            markupRate: 0,
          })
        }
        const st = supplierTotals.get(code)!
        supplierTotals.set(code, {
          ...st,
          cost: st.cost + sup.cost,
          price: st.price + sup.price,
        })
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
      interDepartmentOut.cost !== 0

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

// ─── Store result assembler ───────────────────────────────

/**
 * 月間集計から最終的な StoreResult を組み立てる
 */
function assembleStoreResult(
  storeId: string,
  acc: MonthlyAccumulator,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): StoreResult {
  const invConfig = data.settings.get(storeId)
  const budgetData = data.budget.get(storeId)

  // 売上納品
  const deliverySalesPrice = acc.totalFlowerPrice + acc.totalDirectProducePrice
  const deliverySalesCost = acc.totalFlowerCost + acc.totalDirectProduceCost

  // コア売上（月間）
  const { coreSales: totalCoreSales } = calculateCoreSales(
    acc.totalSales,
    acc.totalFlowerPrice,
    acc.totalDirectProducePrice,
  )

  // 在庫仕入原価 = 総仕入原価 - 売上納品原価
  const inventoryCost = acc.totalCost - deliverySalesCost

  // 粗売上（月間）
  const grossSales = acc.totalSales + acc.totalDiscount

  // 売変率
  const discountRate = calculateDiscountRate(acc.totalSales, acc.totalDiscount)

  // 値入率
  const allPurchasePrice = acc.totalPurchasePrice + acc.totalFlowerPrice + acc.totalDirectProducePrice
  const allPurchaseCost = acc.totalPurchaseCost + acc.totalFlowerCost + acc.totalDirectProduceCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(
    acc.totalPurchasePrice - acc.totalPurchaseCost,
    acc.totalPurchasePrice,
    settings.defaultMarkupRate,
  )

  // 【在庫法】
  const invResult = calculateInvMethod({
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalPurchaseCost: acc.totalCost,
    totalSales: acc.totalSales,
  })

  // 【推定法】
  const estResult = calculateEstMethod({
    coreSales: totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    consumableCost: acc.totalConsumable,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })

  // 売変ロス原価
  const { discountLossCost } = calculateDiscountImpact({
    coreSales: totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })

  // 消耗品率
  const consumableRate = safeDivide(acc.totalConsumable, acc.totalSales, 0)

  // カテゴリ集計
  addToCategory(acc.categoryTotals, 'flowers', { cost: acc.totalFlowerCost, price: acc.totalFlowerPrice })
  addToCategory(acc.categoryTotals, 'directProduce', { cost: acc.totalDirectProduceCost, price: acc.totalDirectProducePrice })
  addToCategory(acc.categoryTotals, 'consumables', { cost: acc.totalConsumable, price: 0 })
  addToCategory(acc.categoryTotals, 'interStore', addCostPricePairs(acc.transferTotals.interStoreIn, acc.transferTotals.interStoreOut))
  addToCategory(acc.categoryTotals, 'interDepartment', addCostPricePairs(acc.transferTotals.interDepartmentIn, acc.transferTotals.interDepartmentOut))

  // 移動詳細
  const transferDetails: TransferDetails = {
    ...acc.transferTotals,
    netTransfer: {
      cost:
        acc.transferTotals.interStoreIn.cost +
        acc.transferTotals.interStoreOut.cost +
        acc.transferTotals.interDepartmentIn.cost +
        acc.transferTotals.interDepartmentOut.cost,
      price:
        acc.transferTotals.interStoreIn.price +
        acc.transferTotals.interStoreOut.price +
        acc.transferTotals.interDepartmentIn.price +
        acc.transferTotals.interDepartmentOut.price,
    },
  }

  // 取引先値入率の後計算
  for (const [code, st] of acc.supplierTotals) {
    acc.supplierTotals.set(code, {
      ...st,
      markupRate: safeDivide(st.price - st.cost, st.price, 0),
    })
  }

  // 予算
  const budget = budgetData?.total ?? settings.defaultBudget
  const budgetDaily = budgetData?.daily ?? new Map<number, number>()
  const gpBudget = invConfig?.grossProfitBudget ?? 0

  // 予算分析
  const salesDaily = new Map<number, number>()
  for (const [d, rec] of acc.daily) {
    salesDaily.set(d, rec.sales)
  }
  const budgetAnalysis = calculateBudgetAnalysis({
    totalSales: acc.totalSales,
    budget,
    budgetDaily,
    salesDaily,
    elapsedDays: acc.elapsedDays,
    salesDays: acc.salesDays,
    daysInMonth,
  })

  return {
    storeId,
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalSales: acc.totalSales,
    totalCoreSales,
    deliverySalesPrice,
    flowerSalesPrice: acc.totalFlowerPrice,
    directProduceSalesPrice: acc.totalDirectProducePrice,
    grossSales,
    totalCost: acc.totalCost,
    inventoryCost,
    deliverySalesCost,
    invMethodCogs: invResult.cogs,
    invMethodGrossProfit: invResult.grossProfit,
    invMethodGrossProfitRate: invResult.grossProfitRate,
    estMethodCogs: estResult.cogs,
    estMethodMargin: estResult.margin,
    estMethodMarginRate: estResult.marginRate,
    estMethodClosingInventory: estResult.closingInventory,
    totalDiscount: acc.totalDiscount,
    discountRate,
    discountLossCost,
    averageMarkupRate,
    coreMarkupRate,
    totalConsumable: acc.totalConsumable,
    consumableRate,
    budget,
    grossProfitBudget: gpBudget,
    grossProfitRateBudget: safeDivide(gpBudget, budget, 0),
    budgetDaily,
    daily: acc.daily,
    categoryTotals: acc.categoryTotals,
    supplierTotals: acc.supplierTotals,
    transferDetails,
    elapsedDays: acc.elapsedDays,
    salesDays: acc.salesDays,
    averageDailySales: budgetAnalysis.averageDailySales,
    projectedSales: budgetAnalysis.projectedSales,
    projectedAchievement: budgetAnalysis.projectedAchievement,
  }
}

// ─── Public API ───────────────────────────────────────────

/**
 * 店舗別の計算結果を生成する
 */
export function calculateStoreResult(
  storeId: string,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): StoreResult {
  const acc = buildDailyRecords(storeId, data, daysInMonth)
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

// ─── Aggregation ──────────────────────────────────────────

function addToCategory(
  map: Map<CategoryType, CostPricePair>,
  category: CategoryType,
  pair: CostPricePair,
): void {
  const existing = map.get(category) ?? ZERO_COST_PRICE_PAIR
  map.set(category, addCostPricePairs(existing, pair))
}

/** 日別レコードをマージする */
function mergeDailyRecord(existing: DailyRecord, rec: DailyRecord): DailyRecord {
  const mergedSB = new Map(existing.supplierBreakdown)
  for (const [code, pair] of rec.supplierBreakdown) {
    const ex = mergedSB.get(code) ?? ZERO_COST_PRICE_PAIR
    mergedSB.set(code, addCostPricePairs(ex, pair))
  }

  return {
    day: existing.day,
    sales: existing.sales + rec.sales,
    coreSales: existing.coreSales + rec.coreSales,
    grossSales: existing.grossSales + rec.grossSales,
    purchase: addCostPricePairs(existing.purchase, rec.purchase),
    deliverySales: addCostPricePairs(existing.deliverySales, rec.deliverySales),
    interStoreIn: addCostPricePairs(existing.interStoreIn, rec.interStoreIn),
    interStoreOut: addCostPricePairs(existing.interStoreOut, rec.interStoreOut),
    interDepartmentIn: addCostPricePairs(existing.interDepartmentIn, rec.interDepartmentIn),
    interDepartmentOut: addCostPricePairs(existing.interDepartmentOut, rec.interDepartmentOut),
    flowers: addCostPricePairs(existing.flowers, rec.flowers),
    directProduce: addCostPricePairs(existing.directProduce, rec.directProduce),
    consumable: {
      cost: existing.consumable.cost + rec.consumable.cost,
      items: [...existing.consumable.items, ...rec.consumable.items],
    },
    discountAmount: existing.discountAmount + rec.discountAmount,
    discountAbsolute: existing.discountAbsolute + rec.discountAbsolute,
    supplierBreakdown: mergedSB,
    transferBreakdown: {
      interStoreIn: [...existing.transferBreakdown.interStoreIn, ...rec.transferBreakdown.interStoreIn],
      interStoreOut: [...existing.transferBreakdown.interStoreOut, ...rec.transferBreakdown.interStoreOut],
      interDepartmentIn: [...existing.transferBreakdown.interDepartmentIn, ...rec.transferBreakdown.interDepartmentIn],
      interDepartmentOut: [...existing.transferBreakdown.interDepartmentOut, ...rec.transferBreakdown.interDepartmentOut],
    },
  }
}

/**
 * 複数店舗の StoreResult を合算する
 */
export function aggregateStoreResults(results: readonly StoreResult[], daysInMonth: number): StoreResult {
  if (results.length === 0) {
    throw new Error('Cannot aggregate 0 results')
  }

  let totalSales = 0
  let totalCoreSales = 0
  let deliverySalesPrice = 0
  let flowerSalesPrice = 0
  let directProduceSalesPrice = 0
  let grossSales = 0
  let totalCost = 0
  let inventoryCost = 0
  let deliverySalesCost = 0
  let totalDiscount = 0
  let totalConsumable = 0
  let budget = 0
  let gpBudget = 0
  let elapsedDays = 0
  let salesDays = 0

  let openInv = 0
  let closeInv = 0
  let hasOpening = false
  let hasClosing = false

  const aggDaily = new Map<number, DailyRecord>()
  const aggCategory = new Map<CategoryType, CostPricePair>()
  const aggSupplier = new Map<string, SupplierTotal>()
  const aggBudgetDaily = new Map<number, number>()
  const aggTransfer = {
    interStoreIn: { ...ZERO_COST_PRICE_PAIR },
    interStoreOut: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentIn: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentOut: { ...ZERO_COST_PRICE_PAIR },
  }

  for (const r of results) {
    totalSales += r.totalSales
    totalCoreSales += r.totalCoreSales
    deliverySalesPrice += r.deliverySalesPrice
    flowerSalesPrice += r.flowerSalesPrice
    directProduceSalesPrice += r.directProduceSalesPrice
    grossSales += r.grossSales
    totalCost += r.totalCost
    inventoryCost += r.inventoryCost
    deliverySalesCost += r.deliverySalesCost
    totalDiscount += r.totalDiscount
    totalConsumable += r.totalConsumable
    budget += r.budget
    gpBudget += r.grossProfitBudget
    elapsedDays = Math.max(elapsedDays, r.elapsedDays)
    salesDays = Math.max(salesDays, r.salesDays)

    if (r.openingInventory != null) { openInv += r.openingInventory; hasOpening = true }
    if (r.closingInventory != null) { closeInv += r.closingInventory; hasClosing = true }

    // 日別集計
    for (const [day, rec] of r.daily) {
      const existing = aggDaily.get(day)
      if (!existing) {
        aggDaily.set(day, {
          ...rec,
          supplierBreakdown: new Map(rec.supplierBreakdown),
          transferBreakdown: {
            interStoreIn: [...rec.transferBreakdown.interStoreIn],
            interStoreOut: [...rec.transferBreakdown.interStoreOut],
            interDepartmentIn: [...rec.transferBreakdown.interDepartmentIn],
            interDepartmentOut: [...rec.transferBreakdown.interDepartmentOut],
          },
        })
      } else {
        aggDaily.set(day, mergeDailyRecord(existing, rec))
      }
    }

    // カテゴリ集計
    for (const [cat, pair] of r.categoryTotals) {
      addToCategory(aggCategory, cat, pair)
    }

    // 取引先集計
    for (const [code, st] of r.supplierTotals) {
      const ex = aggSupplier.get(code)
      if (!ex) {
        aggSupplier.set(code, { ...st })
      } else {
        aggSupplier.set(code, {
          ...ex,
          cost: ex.cost + st.cost,
          price: ex.price + st.price,
          markupRate: safeDivide(ex.price + st.price - ex.cost - st.cost, ex.price + st.price, 0),
        })
      }
    }

    // 予算日別集計
    for (const [day, val] of r.budgetDaily) {
      aggBudgetDaily.set(day, (aggBudgetDaily.get(day) ?? 0) + val)
    }

    // 移動集計
    aggTransfer.interStoreIn = addCostPricePairs(aggTransfer.interStoreIn, r.transferDetails.interStoreIn)
    aggTransfer.interStoreOut = addCostPricePairs(aggTransfer.interStoreOut, r.transferDetails.interStoreOut)
    aggTransfer.interDepartmentIn = addCostPricePairs(aggTransfer.interDepartmentIn, r.transferDetails.interDepartmentIn)
    aggTransfer.interDepartmentOut = addCostPricePairs(aggTransfer.interDepartmentOut, r.transferDetails.interDepartmentOut)
  }

  const discountRate = calculateDiscountRate(totalSales, totalDiscount)

  // 値入率
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  for (const [, st] of aggSupplier) {
    totalPurchaseCost += st.cost
    totalPurchasePrice += st.price
  }
  const flowerCat = aggCategory.get('flowers') ?? ZERO_COST_PRICE_PAIR
  const directProduceCat = aggCategory.get('directProduce') ?? ZERO_COST_PRICE_PAIR
  const allPurchasePrice = totalPurchasePrice + flowerCat.price + directProduceCat.price
  const allPurchaseCost = totalPurchaseCost + flowerCat.cost + directProduceCat.cost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(totalPurchasePrice - totalPurchaseCost, totalPurchasePrice, 0)

  const consumableRate = safeDivide(totalConsumable, totalSales, 0)
  const averageDailySales = safeDivide(totalSales, salesDays, 0)

  const openingInventory = hasOpening ? openInv : null
  const closingInventory = hasClosing ? closeInv : null

  // 在庫法集計
  let invMethodCogs: number | null = null
  let invMethodGrossProfit: number | null = null
  let invMethodGrossProfitRate: number | null = null
  if (openingInventory != null && closingInventory != null) {
    invMethodCogs = openingInventory + totalCost - closingInventory
    invMethodGrossProfit = totalSales - invMethodCogs
    invMethodGrossProfitRate = safeDivide(invMethodGrossProfit, totalSales, 0)
  }

  // 推定法集計
  const estMethodCogs = results.reduce((s, r) => s + r.estMethodCogs, 0)
  const estMethodMargin = results.reduce((s, r) => s + r.estMethodMargin, 0)
  const estMethodMarginRate = safeDivide(estMethodMargin, totalCoreSales, 0)
  const hasEstClosing = results.some((r) => r.estMethodClosingInventory != null)
  const estMethodClosingInventory = hasEstClosing
    ? results.reduce((s, r) => s + (r.estMethodClosingInventory ?? 0), 0)
    : null

  const discountLossCost = results.reduce((s, r) => s + r.discountLossCost, 0)
  const remainingDays = daysInMonth - elapsedDays
  const projectedSales = totalSales + averageDailySales * remainingDays
  const projectedAchievement = safeDivide(projectedSales, budget, 0)

  const transferDetails: TransferDetails = {
    ...aggTransfer,
    netTransfer: {
      cost: aggTransfer.interStoreIn.cost + aggTransfer.interStoreOut.cost +
        aggTransfer.interDepartmentIn.cost + aggTransfer.interDepartmentOut.cost,
      price: aggTransfer.interStoreIn.price + aggTransfer.interStoreOut.price +
        aggTransfer.interDepartmentIn.price + aggTransfer.interDepartmentOut.price,
    },
  }

  return {
    storeId: 'aggregate',
    openingInventory,
    closingInventory,
    totalSales,
    totalCoreSales,
    deliverySalesPrice,
    flowerSalesPrice,
    directProduceSalesPrice,
    grossSales,
    totalCost,
    inventoryCost,
    deliverySalesCost,
    invMethodCogs,
    invMethodGrossProfit,
    invMethodGrossProfitRate,
    estMethodCogs,
    estMethodMargin,
    estMethodMarginRate,
    estMethodClosingInventory,
    totalDiscount,
    discountRate,
    discountLossCost,
    averageMarkupRate,
    coreMarkupRate,
    totalConsumable,
    consumableRate,
    budget,
    grossProfitBudget: gpBudget,
    grossProfitRateBudget: safeDivide(gpBudget, budget, 0),
    budgetDaily: aggBudgetDaily,
    daily: aggDaily,
    categoryTotals: aggCategory,
    supplierTotals: aggSupplier,
    transferDetails,
    elapsedDays,
    salesDays,
    averageDailySales,
    projectedSales,
    projectedAchievement,
  }
}
