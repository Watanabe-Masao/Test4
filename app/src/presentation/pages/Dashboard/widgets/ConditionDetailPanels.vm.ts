/**
 * ConditionDetailPanels ViewModel — バレル re-export
 *
 * 元の913行ファイルをパネルグループ別に分割。
 * 共通型は conditionDetailTypes.ts に配置。
 */

// ─── Re-export shared types ─────────────────────────────
export type {
  DetailPanelProps,
  MarkupDetailProps,
  CostInclusionDetailProps,
  SalesYoYDetailProps,
  CustomerYoYDetailProps,
  TxValueDetailProps,
  DailySalesDetailProps,
  SimpleBreakdownProps,
} from './conditionDetailTypes'
export type { SignalLevel, ConditionItem, DisplayMode } from './conditionSummaryUtils'
export { SIGNAL_COLORS } from './conditionSummaryUtils'

// ─── Re-export VMs ──────────────────────────────────────
export {
  prorateGpBudget,
  type GpRateStoreRowVm,
  type GpRateTotalVm,
  type GpRateDetailVm,
  buildGpRateDetailVm,
  type DiscountEntryVm,
  type DiscountStoreRowVm,
  type DiscountTotalVm,
  type DiscountRateDetailVm,
  buildDiscountRateDetailVm,
} from './conditionPanelProfitability.vm'

export {
  aggregateCostInclusionItems,
  type CrossMultRowVm,
  type MarkupStoreRowVm,
  type MarkupTotalVm,
  type MarkupRateDetailVm,
  buildMarkupRateDetailVm,
  type CostInclusionItemVm,
  type CostInclusionStoreRowVm,
  type CostInclusionDetailVm,
  buildCostInclusionDetailVm,
} from './conditionPanelMarkupCost.vm'

export {
  computeStorePrevSales,
  computeStorePrevCustomers,
  type DailyYoYRow,
  buildDailyYoYRows,
  type SalesYoYStoreRowVm,
  type SalesYoYDetailVm,
  buildSalesYoYDetailVm,
  type CustomerYoYStoreRowVm,
  type CustomerYoYDetailVm,
  buildCustomerYoYDetailVm,
} from './conditionPanelYoY.vm'

export {
  formatTxValue,
  type TxValueStoreRowVm,
  type TxValueDailyRowVm,
  type TxValueDetailVm,
  buildTxValueDetailVm,
  type DailySalesStoreRowVm,
  type DailySalesDayVm,
  type DailySalesDetailVm,
  buildDailySalesDetailVm,
  type DailyYoYRenderRow,
  buildDailyYoYRenderRows,
} from './conditionPanelSalesDetail.vm'
