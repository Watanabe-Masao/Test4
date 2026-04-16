/**
 * projectCategoryDailySeries — pure projection from CategoryTimeSalesRecord[] to CategoryDailySeries
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-2):
 * `CategoryTimeSalesRecord[]` (DuckDB から返る部門×時刻×日 raw records、
 * `YoYWaterfallPlan` / `categoryTimeSales` の出力) を `CategoryDailySeries`
 * (presentation 消費可) に変換する **pure 関数**。
 *
 * Phase 6.5 Step B 実装の唯一の意味境界 (category 次元)。本関数の真理値表
 * (parity test) で「row → series 変換の意味」を凍結し、後続の
 * `useCategoryDailyBundle` hook 実装と `YoYWaterfallChart` 載せ替えは
 * 「方針を実装する作業」だけに集中できる。
 *
 * ## 責務
 *
 *   - storeIds subset でフィルタする (row.storeId ベース)
 *   - deptCodes subset でフィルタする (row.department.code ベース)
 *   - `(department.code, dateKey)` で集約する (店×時刻次元を折りたたむ)
 *   - 各 deptCode の entry は `dateKey` 昇順の安定ソート
 *   - `entries` は `deptCode` 昇順の安定ソート (localeCompare)
 *   - 欠損日は配列に現れない (padding しない)
 *   - `deptName` は同一 deptCode の最初の row から pin (projection 時点で紐付け済み)
 *   - `dateKey` は `row.year`/`month`/`day` から `YYYY-MM-DD` 形式で生成
 *
 * ## 非責務
 *
 *   - DuckDB / query: caller (handler / hook) の責務
 *   - 比較期間決定: `ComparisonScope` の責務
 *   - meta.usedFallback / provenance: bundle hook が組み立てる
 *   - React: 完全に pure
 *   - Shapley 要因分解: 既存 `calculateFactorDecomposition` を継続利用
 *
 * ## 入力と射影マッピング
 *
 *   - `row.totalAmount` → `sales` (加算)
 *   - `row.totalQuantity` → `salesQty` (加算)
 *   - `customers` → `0` (現状 `CategoryTimeSalesRecord` に customers フィールドなし、
 *     将来 store-side join で populate 可能。contract 面は保持)
 *
 * 同一 `(deptCode, dateKey)` の複数 row は全て加算される (通常は store×timeSlot
 * で分解されているため複数出現する想定)。
 *
 * @see app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts
 * @see app/src/application/hooks/storeDaily/projectStoreDailySeries.ts (sibling)
 * @see app/src/application/hooks/timeSlot/projectTimeSlotSeries.ts (Step C 参照実装)
 * @see projects/completed/unify-period-analysis/phase-6-5-step-b-design.md
 *
 * @responsibility R:transform
 */
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'
import type {
  CategoryDailyDataPoint,
  CategoryDailyDeptEntry,
  CategoryDailySeries,
} from './CategoryDailyBundle.types'

export interface ProjectCategoryDailySeriesOptions {
  /** 対象期間の日数 (CategoryDailySeries.dayCount に焼く) */
  readonly dayCount: number
  /**
   * 集計対象に絞る storeId の集合。
   * - undefined / 空 set → 全 storeId を採用
   * - 非空 set → 指定外の storeId は除外
   */
  readonly storeIds?: ReadonlySet<string>
  /**
   * 集計対象に絞る deptCode の集合。
   * - undefined / 空 set → 全 deptCode を採用
   * - 非空 set → 指定外の deptCode は除外
   */
  readonly deptCodes?: ReadonlySet<string>
}

/**
 * 空 series の canonical 定数。caller が「比較なし」等を表現するために使う。
 */
export const EMPTY_CATEGORY_DAILY_SERIES: CategoryDailySeries = {
  entries: [],
  grandTotals: {
    sales: 0,
    customers: 0,
    salesQty: 0,
  },
  dayCount: 0,
}

/** `YYYY-MM-DD` 形式の dateKey を (year, month, day) から生成する pure helper */
function buildDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

interface DeptAccumulator {
  name: string
  // dateKey → accumulated metrics
  readonly byDateKey: Map<
    string,
    {
      sales: number
      customers: number
      salesQty: number
    }
  >
}

/**
 * `CategoryTimeSalesRecord[]` → `CategoryDailySeries` の pure projection。
 */
export function projectCategoryDailySeries(
  rows: readonly CategoryTimeSalesRecord[],
  options: ProjectCategoryDailySeriesOptions,
): CategoryDailySeries {
  const wantStores = options.storeIds && options.storeIds.size > 0 ? options.storeIds : null
  const wantDepts = options.deptCodes && options.deptCodes.size > 0 ? options.deptCodes : null

  // Group by deptCode, accumulate per dateKey
  const byDept = new Map<string, DeptAccumulator>()
  for (const row of rows) {
    if (wantStores && !wantStores.has(row.storeId)) continue
    const deptCode = row.department.code
    if (wantDepts && !wantDepts.has(deptCode)) continue

    let acc = byDept.get(deptCode)
    if (!acc) {
      acc = { name: row.department.name, byDateKey: new Map() }
      byDept.set(deptCode, acc)
    }
    const dateKey = buildDateKey(row.year, row.month, row.day)
    const existing = acc.byDateKey.get(dateKey)
    if (existing) {
      existing.sales += row.totalAmount
      existing.salesQty += row.totalQuantity
      // customers は Category 側に存在しないため 0 のまま
    } else {
      acc.byDateKey.set(dateKey, {
        sales: row.totalAmount,
        customers: 0,
        salesQty: row.totalQuantity,
      })
    }
  }

  // Build entries: deptCode 昇順、各 dept 内は dateKey 昇順
  const entries: CategoryDailyDeptEntry[] = [...byDept.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([deptCode, acc]) => {
      const daily: CategoryDailyDataPoint[] = [...acc.byDateKey.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, v]) => ({
          dateKey,
          sales: v.sales,
          customers: v.customers,
          salesQty: v.salesQty,
        }))
      const totals = daily.reduce(
        (t, d) => ({
          sales: t.sales + d.sales,
          customers: t.customers + d.customers,
          salesQty: t.salesQty + d.salesQty,
        }),
        { sales: 0, customers: 0, salesQty: 0 },
      )
      return { deptCode, deptName: acc.name, daily, totals }
    })

  const grandTotals = entries.reduce(
    (g, e) => ({
      sales: g.sales + e.totals.sales,
      customers: g.customers + e.totals.customers,
      salesQty: g.salesQty + e.totals.salesQty,
    }),
    { sales: 0, customers: 0, salesQty: 0 },
  )

  return {
    entries,
    grandTotals,
    dayCount: options.dayCount,
  }
}
