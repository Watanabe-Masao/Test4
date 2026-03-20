/**
 * 後方互換 re-export
 *
 * 実体は application/hooks/useDailySalesData.ts に移動。
 * データ集計ロジックは Application 層の責務。
 */
export {
  useDailySalesData,
  type WaterfallItem,
  type BaseDayItem,
  type DailySalesDataResult,
  type DiffTarget,
} from '@/application/hooks/useDailySalesData'
