/**
 * YoYWaterfallChart ViewModel
 *
 * CTS レコードの集約・分解計算を純粋関数として抽出。React 非依存。
 *
 * Phase 6.5-5b: `aggregateTotalQuantity` を `CategoryDailySeries`
 * (grandTotals.salesQty) 経由に切替。旧 raw row 配列引数は削除し、
 * lane からの取得に一本化する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

/**
 * CategoryDailySeries から合計点数 (salesQty) を取り出す。
 *
 * 元は raw CTS row 配列を `reduce` で合計していたが、Phase 6.5-5b
 * で projection 側 (`projectCategoryDailySeries`) が `grandTotals.salesQty`
 * を事前計算するため、本関数は単なる pass-through + null-safe wrapper になる。
 *
 * null (bundle 未ロード) のときは 0 を返す。
 */
export function aggregateTotalQuantity(series: CategoryDailySeries | null): number {
  return series?.grandTotals.salesQty ?? 0
}
