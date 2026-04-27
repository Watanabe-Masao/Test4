/**
 * @responsibility R:unclassified
 */

// Phase 1: Frame / Fetch Plan 最小導入
export { buildMonthlyFrame } from './buildMonthlyFrame'
export { buildAnalysisFrame } from './buildAnalysisFrame'
export { buildTemporalFetchPlan } from './buildTemporalFetchPlan'

// Phase 5: Dashboard scope resolver
export {
  buildTemporalInputFromDashboardScope,
  DEFAULT_OVERLAY_CONFIG,
} from './buildTemporalInputFromDashboardScope'
export type {
  DashboardTemporalScope,
  TemporalOverlayConfig,
} from './buildTemporalInputFromDashboardScope'

// 型 re-export
export type {
  MonthlyFrame,
  RollingAnalysisFrame,
  NonRollingAnalysisFrame,
  AnalysisFrame,
  TemporalFetchPlan,
  YearMonthKey,
} from './TemporalFrameTypes'
