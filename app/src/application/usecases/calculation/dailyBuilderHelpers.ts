/**
 * dailyBuilder の内部 pure 関数群
 *
 * buildDailyRecords() から抽出した純粋な集約・構成ロジック。
 * application 層内の分解であり、domain/ への移管は行わない。
 */
import type {
  CostPricePair,
  TransferBreakdownEntry,
  TransferDayEntry,
  SupplierTotal,
  CategoryType,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR } from '@/domain/models'

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
