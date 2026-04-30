/**
 * Architecture Rules — barrel re-export
 *
 * 全 consumer がこのファイル経由でアクセスする。
 * types.ts / rules.ts / helpers.ts に分割された内容を 1 箇所から re-export する。
 *
 * @responsibility R:unclassified
 */

// 型定義 + Core 型 re-export
export type {
  // App Domain 型
  PrincipleId,
  RuleBinding,
  ArchitectureRule,
  // Core 型 re-export
  DetectionType,
  RuleMaturity,
  AagSlice,
  RuleClassification,
  ConfidenceLevel,
  FixNowClassification,
  DetectionSeverity,
  MigrationEffort,
  RuleTier,
  DetectionConfig,
  DecisionCriteria,
  MigrationRecipe,
  ExecutionPlan,
  ReviewPolicy,
  LifecyclePolicy,
  RuleRelationships,
  RuleSemantics,
  RuleGovernance,
  RuleOperationalState,
  RuleDetectionSpec,
  // SemanticTraceBinding family (Project B Phase 1)
  TraceBindingStatus,
  SemanticTraceRef,
  CanonicalDocTraceRef,
  MetaRequirementTraceRef,
  SemanticTraceBinding,
} from './types'

export { SLICE_GUIDANCE } from './types'

// ルール定義データ（App Domain + Project Overlay の derived merge）
export { ARCHITECTURE_RULES } from './merged'

// ヘルパー関数 + AagResponse 型
export {
  getRuleById,
  getRulesByGuardTag,
  getRulesByDetectionType,
  getRuleByResponsibilityTag,
  checkRatchetDown,
  formatViolationMessage,
  buildAagResponse,
  renderAagResponse,
  buildObligationResponse,
} from './helpers'

export type { AagResponse } from './helpers'
