/**
 * 仕入比較データ構築ヘルパー（純粋関数）— バレル re-export
 *
 * 分割先:
 * - purchaseComparisonKpi.ts: ユーティリティ・KPI・店舗構築
 * - purchaseComparisonCategory.ts: 取引先・カテゴリ別データ構築
 * - purchaseComparisonDaily.ts: 日別データ・ピボット構築
 *
 * @responsibility R:barrel
 */
export {
  toDateKey,
  categoryLabel,
  categoryColor,
  markupRate,
  CUSTOM_CATEGORY_COLORS,
  SPECIAL_SALES_CATEGORY_MAP,
  TRANSFERS_CATEGORY_MAP,
  buildKpi,
  buildStoreData,
} from './purchaseComparisonKpi'
export type { KpiTotals } from './purchaseComparisonKpi'
export { buildSupplierAndCategoryData } from './purchaseComparisonCategory'
export { buildDailyData, buildDailyPivot } from './purchaseComparisonDaily'
