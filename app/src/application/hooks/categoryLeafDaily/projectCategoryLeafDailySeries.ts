/**
 * projectCategoryLeafDailySeries — pure projection from raw CTS records to leaf series
 *
 * `CategoryTimeSalesRecord[]` を `CategoryLeafDailySeries` にラップする。
 * entries は raw record を基底に **flat field** (`deptCode` / `deptName` /
 * `lineCode` / `lineName` / `klassCode` / `klassName`) を computed して付与する
 * (category-leaf-daily-entry-shape-break Phase 1)。
 *
 * ## 責務
 *
 *   - entries を stable order（dateKey → dept → line → klass）で保持
 *   - nested field (`department.code` 等) から flat field (`deptCode` 等) を生成
 *     し entry に同梱する (**flat field 生成の唯一点**)
 *   - grandTotals（amount / quantity）を計算
 *   - dayCount を伝搬
 *
 * ## 非責務
 *
 *   - entries の粒度変更（現状 records をそのまま採用）
 *   - comparison / fallback の解決（bundle hook の責務）
 *   - flat field の consumer 側手動生成 (**必ず本関数を経由すること**)
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
 * raw CTS records を flat field 付きの `CategoryLeafDailyEntry[]` に変換する。
 *
 * **flat field 生成の唯一実装。** series を作らない (grandTotals / dayCount が不要な)
 * 経路 (例: 単発 wow query / YoYWaterfall plan の raw records / Admin builders)
 * から呼ばれ、`projectCategoryLeafDailySeries` 内部でも再利用される。
 *
 * consumer が手動で `{ ...rec, deptCode: rec.department.code }` 等を組まない
 * (category-leaf-daily-entry-shape-break plan.md §不可侵原則 §3)。
 */
export function toCategoryLeafDailyEntries(
  records: readonly CategoryTimeSalesRecord[],
): readonly CategoryLeafDailyEntry[] {
  return records.map((r) => ({
    ...r,
    deptCode: r.department.code,
    deptName: r.department.name,
    lineCode: r.line.code,
    lineName: r.line.name,
    klassCode: r.klass.code,
    klassName: r.klass.name,
  }))
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

  // flat field を computed して付与 (nested field は存置 = intersection 型のため)。
  // Phase 4 で独立 interface 化する際、nested field を entry から除外する形に変更する。
  const entries = toCategoryLeafDailyEntries(records)

  return {
    entries,
    grandTotals: { amount, quantity },
    dayCount: options.dayCount,
  }
}
