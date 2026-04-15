/**
 * projectStoreDailySeries — pure projection from StoreDaySummaryRow[] to StoreDailySeries
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-2):
 * `StoreDaySummaryRow[]` (DuckDB から返る店×日 raw rows、既存
 * `storeDaySummaryHandler` の出力) を `StoreDailySeries` (presentation 消費可)
 * に変換する **pure 関数**。
 *
 * Phase 6.5 Step B 実装の唯一の意味境界 (store 次元)。本関数の真理値表
 * (parity test) で「row → series 変換の意味」を凍結し、後続の
 * `useStoreDailyBundle` hook 実装と `SalesPurchaseComparisonChart` 載せ替えは
 * 「方針を実装する作業」だけに集中できる。
 *
 * ## 責務
 *
 *   - storeIds subset でフィルタする
 *   - `(storeId, dateKey)` で集約する (同 cell の複数 row があれば合計)
 *   - 各 storeId の entry は `dateKey` 昇順の安定ソート
 *   - `entries` は `storeId` 昇順の安定ソート (localeCompare)
 *   - 欠損日は配列に現れない (padding しない、Time-slot 版の byHour[h]=null
 *     とは異なり、配列要素そのものが存在しない)
 *   - 各 entry の `totals` と series の `grandTotals` の整合
 *
 * ## 非責務
 *
 *   - DuckDB / query: caller (handler / hook) の責務
 *   - 比較期間決定: `ComparisonScope` の責務
 *   - meta.usedFallback / provenance: bundle hook が組み立てる
 *   - React: 完全に pure
 *
 * ## 入力と射影マッピング
 *
 *   - `row.dateKey` → `StoreDailyDataPoint.dateKey` (pass-through)
 *   - `row.sales` → `sales`
 *   - `row.customers` → `customers`
 *   - `row.purchaseCost` → `purchaseCost`
 *   - `row.grossSales` → `grossSales`
 *
 * 同一 `(storeId, dateKey)` の複数 row は加算される (defensive — infra query
 * 側で通常は重複しないが、parity test で凍結しておく)。
 *
 * @see app/src/application/hooks/storeDaily/StoreDailyBundle.types.ts
 * @see app/src/application/hooks/timeSlot/projectTimeSlotSeries.ts (Step C 参照実装)
 * @see projects/unify-period-analysis/phase-6-5-step-b-design.md
 *
 * @responsibility R:transform
 */
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'
import type {
  StoreDailyDataPoint,
  StoreDailySeries,
  StoreDailyStoreEntry,
} from './StoreDailyBundle.types'

export interface ProjectStoreDailySeriesOptions {
  /** 対象期間の日数 (StoreDailySeries.dayCount に焼く) */
  readonly dayCount: number
  /**
   * 集計対象に絞る storeId の集合。
   * - undefined / 空 set → row に含まれる全 storeId を採用
   * - 非空 set → 指定外の storeId は除外
   */
  readonly storeIds?: ReadonlySet<string>
}

/**
 * 空 series の canonical 定数。caller が「比較なし」等を表現するために使う。
 */
export const EMPTY_STORE_DAILY_SERIES: StoreDailySeries = {
  entries: [],
  grandTotals: {
    sales: 0,
    customers: 0,
    purchaseCost: 0,
    grossSales: 0,
  },
  dayCount: 0,
}

interface StoreAccumulator {
  // dateKey → accumulated metrics
  readonly byDateKey: Map<
    string,
    {
      sales: number
      customers: number
      purchaseCost: number
      grossSales: number
    }
  >
}

/**
 * `StoreDaySummaryRow[]` → `StoreDailySeries` の pure projection。
 */
export function projectStoreDailySeries(
  rows: readonly StoreDaySummaryRow[],
  options: ProjectStoreDailySeriesOptions,
): StoreDailySeries {
  const wantStores = options.storeIds && options.storeIds.size > 0 ? options.storeIds : null

  // Group by storeId, accumulate per dateKey
  const byStore = new Map<string, StoreAccumulator>()
  for (const row of rows) {
    if (wantStores && !wantStores.has(row.storeId)) continue
    let acc = byStore.get(row.storeId)
    if (!acc) {
      acc = { byDateKey: new Map() }
      byStore.set(row.storeId, acc)
    }
    const existing = acc.byDateKey.get(row.dateKey)
    if (existing) {
      existing.sales += row.sales
      existing.customers += row.customers
      existing.purchaseCost += row.purchaseCost
      existing.grossSales += row.grossSales
    } else {
      acc.byDateKey.set(row.dateKey, {
        sales: row.sales,
        customers: row.customers,
        purchaseCost: row.purchaseCost,
        grossSales: row.grossSales,
      })
    }
  }

  // Build entries: storeId 昇順、各 store 内は dateKey 昇順
  const entries: StoreDailyStoreEntry[] = [...byStore.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([storeId, acc]) => {
      const daily: StoreDailyDataPoint[] = [...acc.byDateKey.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, v]) => ({
          dateKey,
          sales: v.sales,
          customers: v.customers,
          purchaseCost: v.purchaseCost,
          grossSales: v.grossSales,
        }))
      const totals = daily.reduce(
        (t, d) => ({
          sales: t.sales + d.sales,
          customers: t.customers + d.customers,
          purchaseCost: t.purchaseCost + d.purchaseCost,
          grossSales: t.grossSales + d.grossSales,
        }),
        { sales: 0, customers: 0, purchaseCost: 0, grossSales: 0 },
      )
      return { storeId, daily, totals }
    })

  const grandTotals = entries.reduce(
    (g, e) => ({
      sales: g.sales + e.totals.sales,
      customers: g.customers + e.totals.customers,
      purchaseCost: g.purchaseCost + e.totals.purchaseCost,
      grossSales: g.grossSales + e.totals.grossSales,
    }),
    { sales: 0, customers: 0, purchaseCost: 0, grossSales: 0 },
  )

  return {
    entries,
    grandTotals,
    dayCount: options.dayCount,
  }
}
