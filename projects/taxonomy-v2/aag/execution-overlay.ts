/**
 * Template Project Overlay — 空 overlay
 *
 * 新 project は全 rule を DEFAULT_EXECUTION_OVERLAY で動かせる。
 * 案件固有の override が必要な rule だけを明示的に書く。
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
 * - references/03-implementation/governance-final-placement-plan.md
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
 *
 * 例:
 *   export const EXECUTION_OVERLAY: ExecutionOverlay = {
 *     'AR-001': { fixNow: 'debt' }, // priority / effort は defaults を使う
 *   }
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {}
