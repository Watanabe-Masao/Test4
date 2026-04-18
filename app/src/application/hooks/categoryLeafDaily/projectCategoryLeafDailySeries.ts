/**
 * projectCategoryLeafDailySeries — pure projection from raw CTS records to leaf series
 *
 * `CategoryTimeSalesRecord[]` を `CategoryLeafDailySeries` にラップする。
 * 初期実装では entries = records のまま、grandTotals と dayCount を集約する。
 *
 * ## 責務
 *
 *   - entries を stable order（dateKey → dept → line → klass）で保持
 *   - grandTotals（amount / quantity）を計算
 *   - dayCount を伝搬
 *
 * ## 非責務
 *
 *   - entries の粒度変更（現状 records をそのまま採用）
 *   - comparison / fallback の解決（bundle hook の責務）
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

  // 現状 entries は records をそのまま採用。将来独自型に進化する際はここで変換。
  const entries: readonly CategoryLeafDailyEntry[] = records

  return {
    entries,
    grandTotals: { amount, quantity },
    dayCount: options.dayCount,
  }
}
