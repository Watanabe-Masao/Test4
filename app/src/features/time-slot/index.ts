/**
 * features/time-slot — 時間帯分析スライス
 *
 * 時間帯売上分析・コアタイム検出・天気連動・WASM bridge を含む。
 * 外部からの参照はこの barrel 経由のみ許可。
 *
 * 原則:
 *   - 他の features/* への直接依存は禁止（shared/ 経由のみ）
 *   - domain/calculations/ の authoritative 関数は domain/ から re-export
 *   - 実体ファイルは段階的に移行（既存パスからの re-export で後方互換維持）
 */

// ─── Domain（純粋計算） ────────────────────────────────
export { findCoreTime, findTurnaroundHour } from './domain'

// ─── Application（hooks / plans） ──────────────────────
export {
  useTimeSlotData,
  useTimeSlotPlan,
  useTimeSlotWeatherPlan,
  useTimeSlotHierarchyPlan,
} from './application'
export type { TimeSlotPlanParams, TimeSlotPlanResult, CompMode } from './application'
