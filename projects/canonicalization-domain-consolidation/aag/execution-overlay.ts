/**
 * canonicalization-domain-consolidation Project Overlay — 空 overlay
 *
 * 本 project は status=draft で立ち上がっており、active 化（CURRENT_PROJECT.md
 * 切替）が行われた段階で本 overlay に AR rule の reviewPolicy / fixNow /
 * executionPlan を埋める。
 *
 * 本 project が active overlay 化された場合は、merged.ts が要求する全 rule の
 * reviewPolicy を埋める作業が必要（pure-calculation-reorg overlay 参照）。
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
 * 本 project は status=draft。active 化された段階で全 rule の reviewPolicy を
 * 埋める（pure-calculation-reorg overlay と同形）。Phase B で domain landing
 * 後に AR-INTEGRITY-* 系の新 rule をここに追加していく予定。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {}
