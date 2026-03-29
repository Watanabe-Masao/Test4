/**
 * YoYWaterfallChart ViewModel
 *
 * CTS レコードの集約・分解計算を純粋関数として抽出。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

/** CTS レコード配列から合計点数を集約する */
export function aggregateTotalQuantity(records: readonly CategoryTimeSalesRecord[]): number {
  return records.reduce((s, rec) => s + rec.totalQuantity, 0)
}
