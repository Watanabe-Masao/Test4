/**
 * 日次売上データ変換の純粋関数群
 *
 * 正本は features/sales/application/dailySalesTransform.ts に移動。
 * 後方互換のための re-export。
 */
export {
  buildBaseDayItems,
  buildWaterfallData,
  createDowFilter,
  type BaseDayItemsResult,
} from '@/features/sales'
