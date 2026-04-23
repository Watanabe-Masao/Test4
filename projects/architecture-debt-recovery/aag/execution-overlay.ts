/**
 * architecture-debt-recovery Project Overlay — 空 overlay（draft 初期状態）
 *
 * 本 project は `status: "draft"` 初期化。active 昇格（Phase 5）までは
 * `CURRENT_PROJECT.md` から参照されないため、overlay は空で問題ない。
 *
 * Phase 5 で active 昇格する際、experimental rule の reviewPolicy 要件
 * （architectureRuleGuard）を満たすため、必要な entry を追加する。
 * `projects/budget-achievement-simulator/aag/execution-overlay.ts` を参考に、
 * 以下のパターンを想定:
 *
 *   - AR-SAFETY-* 系（silent-catch / fire-forget / insert-verify / prod-validation /
 *     stale-store / worker-timeout）に reviewPolicy + executionPlan + fixNow
 *   - AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION
 *   - AR-CURRENT-CANDIDATE-SEPARATION
 *   - AR-REGISTRY-SINGLE-MASTER
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
 * - projects/budget-achievement-simulator/aag/execution-overlay.ts（Phase 5 で参照）
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
 * draft 初期状態 — overlay は空。
 *
 * active 昇格時（Phase 5）に budget-achievement-simulator の overlay と同等の
 * entry 群を追加する想定。その時点で本 project の `architecture` owner が
 * review policy を持つ。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {}
