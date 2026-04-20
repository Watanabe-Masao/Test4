/**
 * projectCategoryLeafDailySeries — pure projection from raw CTS records to leaf series
 *
 * `CategoryTimeSalesRecord[]` を `CategoryLeafDailySeries` にラップする。
 * entries は raw nested field (`department.code` 等) を読み取り、**独立 interface**
 * の `CategoryLeafDailyEntry` (flat 階層フィールドのみ) に変換する
 * (category-leaf-daily-entry-shape-break Phase 4)。
 *
 * ## 責務
 *
 *   - entries を stable order（dateKey → dept → line → klass）で保持
 *   - raw nested field (`department.code` 等) から flat 階層フィールド
 *     (`deptCode` 等) を生成し、保持フィールド (year/month/day/storeId/
 *     totalAmount/totalQuantity/timeSlots) を明示的にコピーして entry を構成する
 *     (**nested field は entry 構造から除外される。変換の唯一点**)
 *   - grandTotals（amount / quantity）を計算
 *   - dayCount を伝搬
 *
 * ## 非責務
 *
 *   - entries の粒度変更（現状 records をそのまま採用）
 *   - comparison / fallback の解決（bundle hook の責務）
 *   - consumer 側の手動変換 (**必ず本関数を経由すること**)
 *
 * @responsibility R:transform
 */
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type {
  CategoryLeafDailySeries,
  CategoryLeafDailyEntry,
} from './CategoryLeafDailyBundle.types'
import { EMPTY_CATEGORY_LEAF_DAILY_SERIES } from './CategoryLeafDailyBundle.types'

export interface ProjectCategoryLeafDailySeriesOptions {
  /** 対象期間の日数 */
  readonly dayCount: number
}

/**
 * records 参照をキーとした projection 結果のキャッシュ。
 *
 * 同一 records array が渡された場合に同じ entries 参照を返すことで、
 * 下流の useMemo 依存配列 (DrilldownWaterfall / HourlyChart / CategoryFactor
 * 系の record-based memoized aggregations) の不要な再計算を防ぐ。
 *
 * WeakMap のため records array が GC 対象になれば cache 自体も自動解放される。
 * records は `readonly CategoryTimeSalesRecord[]` (= Array オブジェクト) で
 * 非プリミティブなため WeakMap のキーとして有効。
 */
const entriesCache = new WeakMap<
  readonly CategoryTimeSalesRecord[],
  readonly CategoryLeafDailyEntry[]
>()

/**
 * raw CTS records を独立 `CategoryLeafDailyEntry[]` に変換する。
 *
 * **変換の唯一実装 (Phase 4 以降、独立 interface)。** series を作らない
 * (grandTotals / dayCount が不要な) 経路 (例: 単発 wow query / YoYWaterfall plan
 * の raw records / Admin builders) から呼ばれ、
 * `projectCategoryLeafDailySeries` 内部でも再利用される。
 *
 * raw nested field (`r.department.code` 等) を読み取り、flat 階層フィールド
 * (`deptCode` 等) + 保持フィールド (year/month/day/storeId/totalAmount/
 * totalQuantity/timeSlots) を明示的にコピーする。**nested field は entry 構造から
 * 除外される** (structural isolation)。
 *
 * **identity 保証**: 同一 records 参照に対しては同じ entries 参照を返す
 * (WeakMap メモ化)。これにより pairResult/fallbackResult オブジェクトが毎
 * render で再生成される状況でも、下流の record-based memoized aggregations
 * (drilldown / hourly / filter builders) が stable なデータで再計算されない。
 *
 * consumer が手動で raw record から組み立てることは禁止
 * (category-leaf-daily-entry-shape-break plan.md §不可侵原則 §3 /
 * `categoryLeafDailyNestedFieldGuard` 固定モード)。
 */
export function toCategoryLeafDailyEntries(
  records: readonly CategoryTimeSalesRecord[],
): readonly CategoryLeafDailyEntry[] {
  const cached = entriesCache.get(records)
  if (cached !== undefined) return cached
  const entries: readonly CategoryLeafDailyEntry[] = records.map((r) => ({
    year: r.year,
    month: r.month,
    day: r.day,
    storeId: r.storeId,
    deptCode: r.department.code,
    deptName: r.department.name,
    lineCode: r.line.code,
    lineName: r.line.name,
    klassCode: r.klass.code,
    klassName: r.klass.name,
    totalQuantity: r.totalQuantity,
    totalAmount: r.totalAmount,
    timeSlots: r.timeSlots,
  }))
  entriesCache.set(records, entries)
  return entries
}

export function projectCategoryLeafDailySeries(
  records: readonly CategoryTimeSalesRecord[],
  options: ProjectCategoryLeafDailySeriesOptions,
): CategoryLeafDailySeries {
  if (records.length === 0) {
    return { ...EMPTY_CATEGORY_LEAF_DAILY_SERIES, dayCount: options.dayCount }
  }

  let amount = 0
  let quantity = 0
  for (const r of records) {
    amount += r.totalAmount
    quantity += r.totalQuantity
  }

  // Phase 4 以降: raw nested field を flat field + 保持フィールドに変換。
  // nested field は entry 構造から除外される (structural isolation)。
  const entries = toCategoryLeafDailyEntries(records)

  return {
    entries,
    grandTotals: { amount, quantity },
    dayCount: options.dayCount,
  }
}
