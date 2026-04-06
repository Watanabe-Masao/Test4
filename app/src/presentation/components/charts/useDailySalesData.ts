/**
 * 後方互換 re-export
 *
 * 実体は application/hooks/useDailySalesData.ts に移動。
 * データ集計ロジックは Application 層の責務。
 * @responsibility R:orchestration
 */
export {
  useDailySalesData,
  type WaterfallItem,
  type BaseDayItem,
  type DailySalesDataResult,
  type DiffTarget,
  type DailyQuantityData,
} from '@/application/hooks/useDailySalesData'
