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
  rows: readonly { day: number; supplierCode: string; totalCost: number; totalPrice: number }[],
): PurchaseCanonical {
  const { cost, price } = sumCostPrice(rows)
  return {
    rows: rows.map((r) => ({
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
  rows: readonly { day: number; categoryKey: string; totalCost: number; totalPrice: number }[],
): DeliverySalesCanonical | TransfersCanonical {
  const { cost, price } = sumCostPrice(rows)
  return {
    rows: rows.map((r) => ({
      day: r.day,
      categoryKey: r.categoryKey,
      cost: r.totalCost,
      price: r.totalPrice,
    })),
    totalCost: cost,
    totalPrice: price,
  }
}

/** 期間内の全日数のうち、データが存在しない日数を算出 */
function countMissingDays(
  dateFrom: string,
  dateTo: string,
  purchaseRows: readonly { day: number }[],
): number {
  const fromDay = Number(dateFrom.split('-')[2])
  const toDay = Number(dateTo.split('-')[2])
  const totalDays = toDay - fromDay + 1
  if (totalDays <= 0) return 0
  const daysWithData = new Set(purchaseRows.map((r) => r.day))
  return Math.max(0, totalDays - daysWithData.size)
}

// ── QueryHandler ──

export interface PurchaseCostInput extends BaseQueryInput {
  readonly dataVersion: number
}

export interface PurchaseCostOutput {
  readonly model: PurchaseCostReadModel
}

// ── ReadModel → 既存ビルダー用の変換ヘルパー ──

/** ReadModel の purchase.rows を既存 PurchaseDailySupplierRow 形式に変換 */
export function toPurchaseDailySupplierRows(
  model: PurchaseCostReadModel,
): readonly { day: number; supplierCode: string; totalCost: number; totalPrice: number }[] {
  return model.purchase.rows.map((r) => ({
    day: r.day,
    supplierCode: r.supplierCode,
    totalCost: r.cost,
    totalPrice: r.price,
  }))
}

/** ReadModel の deliverySales/transfers rows を既存 CategoryDailyRow 形式に変換 */
export function toCategoryDailyRows(canonical: {
  readonly rows: readonly { day: number; categoryKey: string; cost: number; price: number }[]
}): readonly { day: number; categoryKey: string; totalCost: number; totalPrice: number }[] {
  return canonical.rows.map((r) => ({
    day: r.day,
    categoryKey: r.categoryKey,
    totalCost: r.cost,
    totalPrice: r.price,
  }))
}

/**
 * PurchaseCostHandler — 仕入原価複合正本の QueryHandler
 *
 * 3つの独立正本を並列取得し、PurchaseCostReadModel を構築する。
 * .parse() で runtime 検証（fail fast）。
 */
export const purchaseCostHandler: QueryHandler<PurchaseCostInput, PurchaseCostOutput> = {
  name: 'PurchaseCost',
  async execute(
    conn: AsyncDuckDBConnection,
    input: PurchaseCostInput,
  ): Promise<PurchaseCostOutput> {
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

    const missingDayCount = countMissingDays(input.dateFrom, input.dateTo, purchaseRows)

    // runtime 検証（fail fast）
    const model = PurchaseCostReadModel.parse({
      purchase,
      deliverySales,
      transfers,
      grandTotalCost,
      grandTotalPrice,
      inventoryPurchaseCost,
      inventoryPurchasePrice,
      meta: {
        missingDayCount,
        dataVersion: input.dataVersion,
      },
    })

    return { model }
  },
}
