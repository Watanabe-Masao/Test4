/**
 * バレル re-export — 後方互換（F1）
 *
 * 正本は application/hooks/useTimeSlotData.ts に移設済み。
 */
export { useDuckDBTimeSlotData } from '@/application/hooks/useTimeSlotData'
export type {
  ViewMode,
  MetricMode,
  TimeSlotKpi,
  YoYRow,
  YoYData,
} from '@/application/hooks/useTimeSlotData'
export type { HierarchyOption } from '@/application/hooks/useHierarchySelection'
