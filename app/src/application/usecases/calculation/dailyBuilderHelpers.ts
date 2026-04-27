/**
 * dailyBuilder の内部 pure 関数群
 *
 * buildDailyRecords() から抽出した純粋な集約・構成ロジック。
 * application 層内の分解であり、domain/ への移管は行わない。
 *
 * @responsibility R:unclassified
 */
import type {
  CostPricePair,
  TransferBreakdownEntry,
  TransferDayEntry,
  SupplierTotal,
  CategoryType,
  DiscountEntry,
  CostInclusionDailyRecord,
} from '@/domain/models/record'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs, addDiscountEntries } from '@/domain/models/record'

// ── 移動内訳 ─────────────────────────────────

/** 移動方向ごとの集計結果 */
interface DirectionResult {
  readonly total: CostPricePair
  readonly entries: TransferBreakdownEntry[]
}

/** 移動レコード配列を集計 + 明細変換する */
function aggregateDirection(
  records: readonly { cost: number; price: number; fromStoreId: string; toStoreId: string }[],
): DirectionResult {
  let cost = 0
  let price = 0
  const entries: TransferBreakdownEntry[] = []
  for (const r of records) {
    cost += r.cost
    price += r.price
    entries.push({
      fromStoreId: r.fromStoreId,
      toStoreId: r.toStoreId,
      cost: r.cost,
      price: r.price,
    })
  }
  return { total: { cost, price }, entries }
}

/** 移動内訳を組み立てる */
export interface TransferBreakdownResult {
  readonly interStoreIn: CostPricePair
  readonly interStoreOut: CostPricePair
  readonly interDepartmentIn: CostPricePair
  readonly interDepartmentOut: CostPricePair
  readonly breakdown: {
    readonly interStoreIn: TransferBreakdownEntry[]
    readonly interStoreOut: TransferBreakdownEntry[]
    readonly interDepartmentIn: TransferBreakdownEntry[]
    readonly interDepartmentOut: TransferBreakdownEntry[]
  }
}

export function buildTransferBreakdown(
  interInDay: TransferDayEntry | undefined,
  interOutDay: TransferDayEntry | undefined,
): TransferBreakdownResult {
  const si = interInDay ? aggregateDirection(interInDay.interStoreIn) : null
  const di = interInDay ? aggregateDirection(interInDay.interDepartmentIn) : null
  const so = interOutDay ? aggregateDirection(interOutDay.interStoreOut) : null
  const dOut = interOutDay ? aggregateDirection(interOutDay.interDepartmentOut) : null

  return {
    interStoreIn: si?.total ?? ZERO_COST_PRICE_PAIR,
    interStoreOut: so?.total ?? ZERO_COST_PRICE_PAIR,
    interDepartmentIn: di?.total ?? ZERO_COST_PRICE_PAIR,
    interDepartmentOut: dOut?.total ?? ZERO_COST_PRICE_PAIR,
    breakdown: {
      interStoreIn: si?.entries ?? [],
      interStoreOut: so?.entries ?? [],
      interDepartmentIn: di?.entries ?? [],
      interDepartmentOut: dOut?.entries ?? [],
    },
  }
}

// ── 取引先内訳 ────────────────────────────────

/** 仕入日レコードの取引先別明細を集約する */
export function aggregateSupplierDay(
  suppliers: Record<string, { cost: number; price: number; name: string }>,
  supplierTotals: Map<string, SupplierTotal>,
): Map<string, CostPricePair> {
  const breakdown = new Map<string, CostPricePair>()
  for (const [code, sup] of Object.entries(suppliers)) {
    breakdown.set(code, { cost: sup.cost, price: sup.price })

    const existing = supplierTotals.get(code)
    if (!existing) {
      supplierTotals.set(code, {
        supplierCode: code,
        supplierName: sup.name,
        category: 'other' as CategoryType,
        cost: sup.cost,
        price: sup.price,
        markupRate: 0,
      })
    } else {
      supplierTotals.set(code, {
        ...existing,
        cost: existing.cost + sup.cost,
        price: existing.price + sup.price,
      })
    }
  }
  return breakdown
}

// ── 月次アキュムレーション ──────────────────────

/** accumulateMonthly が更新する可変アキュムレータ */
export interface MutableMonthlyAccumulator {
  totalSales: number
  totalPurchaseCost: number
  totalPurchasePrice: number
  totalFlowerPrice: number
  totalFlowerCost: number
  totalDirectProducePrice: number
  totalDirectProduceCost: number
  totalDiscount: number
  totalDiscountEntries: DiscountEntry[]
  totalCostInclusion: number
  totalCustomers: number
  transferTotals: {
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  }
}

/** 1日分の値を月次アキュムレータに加算する（mutable 更新） */
export function accumulateDay(
  acc: MutableMonthlyAccumulator,
  day: {
    sales: number
    purchase: CostPricePair
    flowers: CostPricePair
    directProduce: CostPricePair
    discountAbsolute: number
    discountEntries: readonly DiscountEntry[]
    costInclusion: CostInclusionDailyRecord
    customers: number
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  },
): void {
  acc.totalSales += day.sales
  acc.totalPurchaseCost += day.purchase.cost
  acc.totalPurchasePrice += day.purchase.price
  acc.totalFlowerPrice += day.flowers.price
  acc.totalFlowerCost += day.flowers.cost
  acc.totalDirectProducePrice += day.directProduce.price
  acc.totalDirectProduceCost += day.directProduce.cost
  acc.totalDiscount += day.discountAbsolute
  acc.totalDiscountEntries = addDiscountEntries(
    acc.totalDiscountEntries,
    day.discountEntries,
  ) as DiscountEntry[]
  acc.totalCostInclusion += day.costInclusion.cost
  acc.totalCustomers += day.customers
  acc.transferTotals.interStoreIn = addCostPricePairs(
    acc.transferTotals.interStoreIn,
    day.interStoreIn,
  )
  acc.transferTotals.interStoreOut = addCostPricePairs(
    acc.transferTotals.interStoreOut,
    day.interStoreOut,
  )
  acc.transferTotals.interDepartmentIn = addCostPricePairs(
    acc.transferTotals.interDepartmentIn,
    day.interDepartmentIn,
  )
  acc.transferTotals.interDepartmentOut = addCostPricePairs(
    acc.transferTotals.interDepartmentOut,
    day.interDepartmentOut,
  )
}
