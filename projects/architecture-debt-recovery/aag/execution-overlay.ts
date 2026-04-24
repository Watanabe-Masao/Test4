/**
 * architecture-debt-recovery Project Overlay — active 昇格時 reviewPolicy 整備
 *
 * 本 project は 2026-04-23 Phase 5 人間承認により draft → active 昇格。
 * `CURRENT_PROJECT.md` = `architecture-debt-recovery` となったため、
 * experimental rule の reviewPolicy 要件（architectureRuleGuard）を満たす必要がある。
 *
 * `projects/completed/budget-achievement-simulator/aag/execution-overlay.ts` と
 * 同構造で、現 architecture owner が 30 日周期で review する規律を確立。
 *
 * 合成ロジック: app/src/test/architectureRules/merged.ts
 * 解決順序: project overlay → DEFAULT_EXECUTION_OVERLAY → error
 *
 * 正本区分:
 * - App Domain: decisionCriteria, migrationRecipe, detection, binding, defaults
 * - Project Overlay（本ファイル）: fixNow, executionPlan, reviewPolicy, lifecyclePolicy
 *
 * 参照:
 * - projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 * - references/03-guides/governance-final-placement-plan.md
 * - projects/completed/budget-achievement-simulator/aag/execution-overlay.ts（参照元）
 *
 * @responsibility R:utility
 */

import type {
  FixNowClassification,
  ExecutionPlan,
  ReviewPolicy,
  LifecyclePolicy,
} from '@/test/aag-core-types'

/** 単一ルールに対する案件運用状態 */
export interface RuleExecutionOverlayEntry {
  readonly fixNow?: FixNowClassification
  readonly executionPlan?: ExecutionPlan
  readonly reviewPolicy?: ReviewPolicy
  readonly lifecyclePolicy?: LifecyclePolicy
}

/** ruleId -> 運用状態のマップ */
export type ExecutionOverlay = {
  readonly [ruleId: string]: RuleExecutionOverlayEntry
}

const SAFETY_REVIEW_POLICY: ReviewPolicy = {
  owner: 'architecture',
  lastReviewedAt: '2026-04-23',
  reviewCadenceDays: 30,
}

/**
 * experimental なルールには `reviewPolicy` が必須（architectureRuleGuard）。
 * 本 project が active の間は architecture owner が 30 日周期で review する。
 *
 * 値は projects/completed/budget-achievement-simulator/aag/execution-overlay.ts のコピー。
 * executionOverlayGuard が executionPlan + fixNow の両必須を要求するため、
 * reviewPolicy のみの上書きにせず defaults.ts の値をそのまま再指定している。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {
  'AR-SAFETY-SILENT-CATCH': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SAFETY-FIRE-FORGET': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SAFETY-INSERT-VERIFY': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SAFETY-PROD-VALIDATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SAFETY-STALE-STORE': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SAFETY-WORKER-TIMEOUT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 4 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-CURRENT-CANDIDATE-SEPARATION': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  'AR-REGISTRY-SINGLE-MASTER': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
}
