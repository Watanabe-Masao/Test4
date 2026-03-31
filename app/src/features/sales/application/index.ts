/**
 * features/sales/application — 売上分析の Application 層
 *
 * sales 固有の usecase / facade / data transform を集約する。
 */
export {
  buildBaseDayItems,
  buildWaterfallData,
  createDowFilter,
  type BaseDayItemsResult,
} from './dailySalesTransform'
