/**
 * features/time-slot/application — 時間帯分析アプリケーション層
 *
 * hook・plan・usecase を re-export する。
 * 実体は段階的に移行予定（現在は既存パスからの re-export）。
 */
export { useTimeSlotData } from '@/application/hooks/useTimeSlotData'
export { useTimeSlotPlan } from '@/application/hooks/plans/useTimeSlotPlan'
export { useTimeSlotWeatherPlan } from '@/application/hooks/plans/useTimeSlotWeatherPlan'
