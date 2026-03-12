/**
 * ConditionDetailPanels — バレル re-export
 *
 * 元の1249行ファイルを4つのドメイングループに分割:
 * - conditionPanelProfitability: 粗利率・売変率
 * - conditionPanelMarkupCost: 値入率・原価算入費
 * - conditionPanelYoY: 売上前年比・客数前年比
 * - conditionPanelSalesDetail: 客単価・日販達成率・シンプル内訳
 */
export { GpRateDetailTable, DiscountRateDetailTable } from './conditionPanelProfitability'
export { MarkupRateDetailTable, CostInclusionDetailTable } from './conditionPanelMarkupCost'
export { SalesYoYDetailTable, CustomerYoYDetailTable } from './conditionPanelYoY'
export {
  TxValueDetailTable,
  DailySalesDetailTable,
  SimpleBreakdown,
} from './conditionPanelSalesDetail'
