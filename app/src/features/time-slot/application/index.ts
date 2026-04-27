/**
 * features/time-slot/application — 時間帯分析アプリケーション層
 *
 * plan hooks は features/time-slot/application/plans/ に実体を持つ。
 *
 * @responsibility R:unclassified
 */
export { useTimeSlotData } from '@/application/hooks/useTimeSlotData'
export { useTimeSlotPlan } from './plans/useTimeSlotPlan'
export type { TimeSlotPlanParams, TimeSlotPlanResult, CompMode } from './plans/useTimeSlotPlan'
export { useTimeSlotWeatherPlan } from './plans/useTimeSlotWeatherPlan'
export { useTimeSlotHierarchyPlan } from './plans/useTimeSlotHierarchyPlan'
