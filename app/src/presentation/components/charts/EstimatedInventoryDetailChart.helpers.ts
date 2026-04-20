/**
 * EstimatedInventoryDetailChart — pure helpers
 *
 * Component 内の useMemo body から抽出した 5 種の pure 関数群（filter / 集約 /
 * 比較モード store エントリ構築 / 比較 chart データ構築）。
 *
 * @responsibility R:transform
 */
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { InventoryDetailRow } from '@/application/hooks/calculation'
import { computeEstimatedInventoryDetails } from '@/application/hooks/calculation'
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'

export type ViewMode = 'aggregate' | 'compare'

export const createFmt = (fmtCurrency: CurrencyFormatter) => (v: number) => fmtCurrency(v)

export const AGG_LABELS: Record<string, string> = {
  inventoryCost: '在庫仕入原価',
  estCogs: '推定原価',
  estimated: '推定在庫',
}

// ─── Pure helpers (extracted from EstimatedInventoryDetailChart.tsx) ─────

/**
 * day 範囲 [start, end] で InventoryDetailRow を絞り込む。
 * Chart の rangeSlider 表示用。
 */
export function filterInventoryDayRange(
  rows: readonly InventoryDetailRow[],
  start: number,
  end: number,
): readonly InventoryDetailRow[] {
  return rows.filter((r) => r.day >= start && r.day <= end)
}

/**
 * 売上 / 仕入原価 / 推定原価 のいずれかが非ゼロの行だけを残す。
 * 空行（データ未入力の日）を表から省くため。
 */
export function filterNonEmptyInventoryRows(
  rows: readonly InventoryDetailRow[],
): readonly InventoryDetailRow[] {
  return rows.filter((r) => r.sales > 0 || r.inventoryCost !== 0 || r.estCogs !== 0)
}

/** 合計行の 6 項目 */
export interface InventoryTotals {
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number
  readonly invCost: number
  readonly cogs: number
  readonly cons: number
}

const ZERO_TOTALS: InventoryTotals = {
  sales: 0,
  coreSales: 0,
  grossSales: 0,
  invCost: 0,
  cogs: 0,
  cons: 0,
}

/**
 * 表示対象行の合計（sales / coreSales / grossSales / invCost / cogs / cons）を計算する。
 */
export function summarizeInventoryTotals(rows: readonly InventoryDetailRow[]): InventoryTotals {
  if (rows.length === 0) return ZERO_TOTALS
  let sales = 0
  let coreSales = 0
  let grossSales = 0
  let invCost = 0
  let cogs = 0
  let cons = 0
  for (const r of rows) {
    sales += r.sales
    coreSales += r.coreSales
    grossSales += r.grossSales
    invCost += r.inventoryCost
    cogs += r.estCogs
    cons += r.costInclusionCost
  }
  return { sales, coreSales, grossSales, invCost, cogs, cons }
}

/** 比較モードで展開する店舗エントリ */
export interface StoreInventoryEntry {
  readonly storeId: string
  readonly name: string
  readonly hasInventory: boolean
  readonly result: StoreResult
}

/**
 * comparisonResults + stores map を比較モードのエントリ配列に展開する。
 * name 未解決は storeId で fallback する。
 */
export function buildStoreInventoryEntries(
  comparisonResults: readonly StoreResult[] | undefined,
  stores: ReadonlyMap<string, Store> | undefined,
): readonly StoreInventoryEntry[] {
  if (!comparisonResults || !stores) return []
  return comparisonResults.map((r) => ({
    storeId: r.storeId,
    name: stores.get(r.storeId)?.name ?? r.storeId,
    hasInventory: r.openingInventory != null,
    result: r,
  }))
}

/**
 * 比較モードのチャート行を店舗×日マトリクスで構築する。
 *
 * 店舗ごとに `computeEstimatedInventoryDetails` を呼んで日別データを得て、
 * day=1..daysInMonth の行に `${store.name}_推定在庫` / `_仕入原価` / `_推定原価` を
 * 埋めた辞書を積み上げる。`hasInventory=false` の店舗は null 埋め。
 */
export function buildComparisonInventoryData(
  storeEntries: readonly StoreInventoryEntry[],
  daysInMonth: number,
  rangeStart: number,
  rangeEnd: number,
): readonly Record<string, number | null>[] {
  const detailsByStore = new Map<string, readonly InventoryDetailRow[]>()
  for (const s of storeEntries) {
    if (!s.hasInventory) continue
    // hasInventory=true ならば openingInventory は non-null（buildStoreInventoryEntries が保証）
    detailsByStore.set(
      s.storeId,
      computeEstimatedInventoryDetails(
        s.result.daily,
        daysInMonth,
        s.result.openingInventory!,
        s.result.closingInventory,
        s.result.coreMarkupRate,
        s.result.discountRate,
      ),
    )
  }

  const data: Record<string, number | null>[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const entry: Record<string, number | null> = { day: d }
    for (const s of storeEntries) {
      const rows = detailsByStore.get(s.storeId)
      entry[`${s.name}_推定在庫`] = rows?.[d - 1]?.estimated ?? null
      entry[`${s.name}_仕入原価`] = rows?.[d - 1]?.inventoryCost ?? 0
      entry[`${s.name}_推定原価`] = rows?.[d - 1]?.estCogs ?? 0
    }
    data.push(entry)
  }
  return data.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)
}
