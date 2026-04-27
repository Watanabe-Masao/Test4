/**
 * features/sales/application — 売上分析の Application 層
 *
 * sales 固有の usecase / facade / data transform を集約する。
 *
 * @responsibility R:unclassified
 */
export {
  buildBaseDayItems,
  buildWaterfallData,
  createDowFilter,
  type BaseDayItemsResult,
} from './dailySalesTransform'
