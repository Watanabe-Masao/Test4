/**
 * aag-doc-responsibility-separation Project Overlay — 空 overlay
 *
 * 本 project は AAG 関連 doc の責務再分離 umbrella であり、AR-rule の
 * 案件固有 override は不要。全 rule は DEFAULT_EXECUTION_OVERLAY で動かす。
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
 * 本 project は doc 責務分離のみ。案件固有 override 不要。
 * Phase 3 ar-rule-audit split で base-rules.ts canonicalDocRef を co-update
 * する場合も rule binding field 側であり、execution overlay 側ではない。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {}
