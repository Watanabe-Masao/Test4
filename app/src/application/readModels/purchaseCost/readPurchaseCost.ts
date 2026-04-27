/**
 * readPurchaseCost — 仕入原価の唯一の正本 read
 *
 * 3つの独立正本（通常仕入・売上納品・移動原価）を DuckDB から取得し、
 * PurchaseCostReadModel として構築・runtime 検証する。
 *
 * この1関数から KPI / カテゴリ / ピボットの全ビューを JS 集計で導出可能。
 * 用途別の組み合わせ:
 *   在庫法:   purchase + deliverySales + transfers = grandTotalCost
 *   推定法:   purchase + transfers = inventoryPurchaseCost（売上納品を除外）
 *   仕入分析: grandTotalCost（3つ全部）
 *
 * @see references/01-principles/purchase-cost-definition.md
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler, BaseQueryInput } from '@/application/queries/QueryContract'
import {
  queryPurchaseDailyBySupplier,
  querySpecialSalesDaily,
  queryTransfersDaily,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import {
  PurchaseCostReadModel,
  type PurchaseCanonical,
  type DeliverySalesCanonical,
  type TransfersCanonical,
} from './PurchaseCostTypes'

// ── 内部ヘルパー ──

function sumCostPrice(rows: readonly { totalCost: number; totalPrice: number }[]): {
  cost: number
  price: number
} {
  let cost = 0
  let price = 0
  for (const r of rows) {
    cost += r.totalCost
    price += r.totalPrice
  }
  return { cost, price }
}

function buildPurchaseCanonical(
  rows: readonly {
    storeId: string
    day: number
    supplierCode: string
    totalCost: number
    totalPrice: number
  }[],
): PurchaseCanonical {
  const { cost, price } = sumCostPrice(rows)
  return {
    rows: rows.map((r) => ({
      storeId: r.storeId,
      day: r.day,
      supplierCode: r.supplierCode,
      cost: r.totalCost,
      price: r.totalPrice,
    })),
    totalCost: cost,
    totalPrice: price,
  }
}

function buildCategoryCanonical(
  rows: readonly {
    storeId: string
    day: number
    categoryKey: string
    totalCost: number
    totalPrice: number
  }[],
): DeliverySalesCanonical | TransfersCanonical {
  const { cost, price } = sumCostPrice(rows)
  return {
    rows: rows.map((r) => ({
      storeId: r.storeId,
      day: r.day,
      categoryKey: r.categoryKey,
      cost: r.totalCost,
      price: r.totalPrice,
    })),
    totalCost: cost,
    totalPrice: price,
  }
}

/** 期間内の全日数のうち、3正本それぞれと複合でデータが存在しない日数を算出 */
function countMissingDays(
  dateFrom: string,
  dateTo: string,
  purchaseRows: readonly { day: number }[],
  specialRows: readonly { day: number }[],
  transferRows: readonly { day: number }[],
): { purchase: number; deliverySales: number; transfers: number; composite: number } {
  // ISO 日付キーベースで全日数を列挙（月跨ぎ対応）
  const from = new Date(dateFrom + 'T00:00:00')
  const to = new Date(dateTo + 'T00:00:00')
  if (from > to) return { purchase: 0, deliverySales: 0, transfers: 0, composite: 0 }

  const purchaseDays = new Set(purchaseRows.map((r) => r.day))
  const specialDays = new Set(specialRows.map((r) => r.day))
  const transferDays = new Set(transferRows.map((r) => r.day))

  let purchaseMissing = 0
  let deliveryMissing = 0
  let transfersMissing = 0
  let compositeMissing = 0
  const cursor = new Date(from)
  while (cursor <= to) {
    const dayOfMonth = cursor.getDate()
    const pMiss = !purchaseDays.has(dayOfMonth)
    const dMiss = !specialDays.has(dayOfMonth)
    const tMiss = !transferDays.has(dayOfMonth)
    if (pMiss) purchaseMissing++
    if (dMiss) deliveryMissing++
    if (tMiss) transfersMissing++
    if (pMiss && dMiss && tMiss) compositeMissing++
    cursor.setDate(cursor.getDate() + 1)
  }
  return {
    purchase: purchaseMissing,
    deliverySales: deliveryMissing,
    transfers: transfersMissing,
    composite: compositeMissing,
  }
}

// ── 純関数 + QueryHandler ──

export interface PurchaseCostInput extends BaseQueryInput {
  readonly dataVersion: number
}

export interface PurchaseCostOutput {
  readonly model: PurchaseCostReadModel
}

// ── ReadModel → 既存ビルダー用の変換ヘルパー ──

/** ReadModel の purchase.rows を既存 PurchaseDailySupplierRow 形式に変換 */
export function toPurchaseDailySupplierRows(model: PurchaseCostReadModel): readonly {
  storeId: string
  day: number
  supplierCode: string
  totalCost: number
  totalPrice: number
}[] {
  return model.purchase.rows.map((r) => ({
    storeId: r.storeId,
    day: r.day,
    supplierCode: r.supplierCode,
    totalCost: r.cost,
    totalPrice: r.price,
  }))
}

/** ReadModel から店舗別の仕入原価合計を導出する */
export function toStoreCostRows(
  model: PurchaseCostReadModel,
): readonly { storeId: string; totalCost: number; totalPrice: number }[] {
  const storeMap = new Map<string, { cost: number; price: number }>()
  const add = (storeId: string, cost: number, price: number) => {
    const existing = storeMap.get(storeId)
    if (existing) {
      existing.cost += cost
      existing.price += price
    } else {
      storeMap.set(storeId, { cost, price })
    }
  }
  for (const r of model.purchase.rows) add(r.storeId, r.cost, r.price)
  for (const r of model.deliverySales.rows) add(r.storeId, r.cost, r.price)
  for (const r of model.transfers.rows) add(r.storeId, r.cost, r.price)

  return Array.from(storeMap.entries())
    .map(([storeId, { cost, price }]) => ({ storeId, totalCost: cost, totalPrice: price }))
    .sort((a, b) => b.totalCost - a.totalCost)
}

/**
 * ReadModel の3正本を day で集約し、日別の totalCost/totalPrice を導出する。
 * 売上 vs 仕入原価チャート用。全正本（通常仕入+売上納品+移動原価）を含む。
 */
export function toDailyCostRows(
  model: PurchaseCostReadModel,
): readonly { day: number; totalCost: number; totalPrice: number }[] {
  const dayMap = new Map<number, { cost: number; price: number }>()
  const add = (day: number, cost: number, price: number) => {
    const existing = dayMap.get(day)
    if (existing) {
      existing.cost += cost
      existing.price += price
    } else {
      dayMap.set(day, { cost, price })
    }
  }
  for (const r of model.purchase.rows) add(r.day, r.cost, r.price)
  for (const r of model.deliverySales.rows) add(r.day, r.cost, r.price)
  for (const r of model.transfers.rows) add(r.day, r.cost, r.price)

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, { cost, price }]) => ({ day, totalCost: cost, totalPrice: price }))
}

/** ReadModel の deliverySales/transfers rows を既存 CategoryDailyRow 形式に変換 */
export function toCategoryDailyRows(canonical: {
  readonly rows: readonly {
    storeId: string
    day: number
    categoryKey: string
    cost: number
    price: number
  }[]
}): readonly {
  storeId: string
  day: number
  categoryKey: string
  totalCost: number
  totalPrice: number
}[] {
  return canonical.rows.map((r) => ({
    storeId: r.storeId,
    day: r.day,
    categoryKey: r.categoryKey,
    totalCost: r.cost,
    totalPrice: r.price,
  }))
}

/**
 * readPurchaseCost — 仕入原価の唯一の read 関数（純関数）
 *
 * 3つの独立正本を並列取得し、PurchaseCostReadModel を構築・runtime 検証する。
 * QueryHandler に依存しないため、テストや直接呼び出しでも使用可能。
 */
/** @rm-id RM-001 */
export async function readPurchaseCost(
  conn: AsyncDuckDBConnection,
  input: PurchaseCostInput,
): Promise<PurchaseCostReadModel> {
  const storeIds = input.storeIds ? [...input.storeIds] : undefined

  // 3つの独立正本を並列取得
  const [purchaseRows, specialRows, transferRows] = await Promise.all([
    queryPurchaseDailyBySupplier(conn, input.dateFrom, input.dateTo, storeIds),
    querySpecialSalesDaily(conn, input.dateFrom, input.dateTo, storeIds),
    queryTransfersDaily(conn, input.dateFrom, input.dateTo, storeIds),
  ])

  // 各正本を構築
  const purchase = buildPurchaseCanonical(purchaseRows)
  const deliverySales = buildCategoryCanonical(specialRows)
  const transfers = buildCategoryCanonical(transferRows)

  // 導出値
  const grandTotalCost = purchase.totalCost + deliverySales.totalCost + transfers.totalCost
  const grandTotalPrice = purchase.totalPrice + deliverySales.totalPrice + transfers.totalPrice
  const inventoryPurchaseCost = purchase.totalCost + transfers.totalCost
  const inventoryPurchasePrice = purchase.totalPrice + transfers.totalPrice

  const missingDays = countMissingDays(
    input.dateFrom,
    input.dateTo,
    purchaseRows,
    specialRows,
    transferRows,
  )

  // runtime 検証（fail fast）
  const parsed = PurchaseCostReadModel.safeParse({
    purchase,
    deliverySales,
    transfers,
    grandTotalCost,
    grandTotalPrice,
    inventoryPurchaseCost,
    inventoryPurchasePrice,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero' as const,
      rounding: {
        amountMethod: 'round' as const,
        amountPrecision: 0 as const,
        rateMethod: 'raw' as const,
      },
      missingDays,
      dataVersion: input.dataVersion,
    },
  })
  if (!parsed.success) {
    throw new Error(`[PurchaseCost] Zod validation failed: ${parsed.error.message}`)
  }
  return parsed.data
}

/**
 * purchaseCostHandler — useQueryWithHandler 用の QueryHandler ラッパー
 *
 * readPurchaseCost 純関数を QueryHandler インターフェースでラップする。
 */
export const purchaseCostHandler: QueryHandler<PurchaseCostInput, PurchaseCostOutput> = {
  name: 'PurchaseCost',
  async execute(
    conn: AsyncDuckDBConnection,
    input: PurchaseCostInput,
  ): Promise<PurchaseCostOutput> {
    const model = await readPurchaseCost(conn, input)
    return { model }
  },
}
