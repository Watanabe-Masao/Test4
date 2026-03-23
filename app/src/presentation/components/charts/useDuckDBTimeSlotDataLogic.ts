/**
 * バレル re-export — 後方互換（F1）
 *
 * 正本は application/usecases/timeSlotDataLogic.ts に移設済み。
 */
export {
  buildWowRange,
  toAmountMap,
  toQuantityMap,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from '@/application/usecases/timeSlotDataLogic'
export type {
  ViewMode,
  MetricMode,
  TimeSlotKpi,
  YoYRow,
  YoYData,
  HierarchyOption,
} from '@/application/usecases/timeSlotDataLogic'
