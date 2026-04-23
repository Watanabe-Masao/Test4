/**
 * budget-achievement-simulator Project Overlay — 空 overlay
 *
 * 本 project は既存ルールの override を持たない。
 * 全 rule を DEFAULT_EXECUTION_OVERLAY で動かす。
 * 新規 feature 追加の案件であり、既存ルールの例外扱いは不要。
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

/**
 * 新 project 立ち上げ直後は空でよい。
 * 案件固有の override を追加するときは、上書きしたいフィールドだけを書く。
 * 未指定フィールドは DEFAULT_EXECUTION_OVERLAY から補完される。
 */

const SAFETY_REVIEW_POLICY: ReviewPolicy = {
  owner: 'architecture',
  lastReviewedAt: '2026-04-23',
  reviewCadenceDays: 30,
}

/**
 * experimental なルールには `reviewPolicy` が必須（architectureRuleGuard）。
 * 現 project が active の間は architecture owner が 30 日周期で review する。
 */
// overlay entry は executionPlan + fixNow を必須とするため、defaults から
// 取ってくる形で再指定 (reviewPolicy のみの上書きでは executionOverlayGuard
// が失敗する)。値は defaults.ts のコピー。
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
