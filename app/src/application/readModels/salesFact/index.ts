/**
 * 売上・販売点数 分析用正本ファクト — バレルエクスポート
 *
 * @responsibility R:unclassified
 */
export { SalesFactReadModel, SalesFactQueryInput } from './SalesFactTypes'
export type {
  SalesFactReadModel as SalesFactReadModelType,
  SalesFactQueryInput as SalesFactQueryInputType,
  SalesFactDailyRow,
  SalesFactHourlyRow,
} from './SalesFactTypes'
export {
  buildSalesFactReadModel,
  toStoreSalesRows,
  toDailySalesRows,
  toHourlySalesRows,
  toDeptSalesRows,
} from './readSalesFact'
export type { SalesFactInput, SalesFactOutput } from './readSalesFact'
