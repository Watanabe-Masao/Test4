/**
 * features/time-slot/domain — 時間帯分析ドメイン層
 *
 * 時間帯計算の authoritative 関数を re-export する。
 * 実体は domain/calculations/timeSlotCalculations.ts に残留（B1 原則）。
 */
export { findCoreTime, findTurnaroundHour } from '@/domain/calculations/timeSlotCalculations'
