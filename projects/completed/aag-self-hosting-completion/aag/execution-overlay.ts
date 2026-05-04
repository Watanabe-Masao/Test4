/**
 * Template Project Overlay — 空 overlay
 *
 * 新 project は全 rule を DEFAULT_EXECUTION_OVERLAY + DEFAULT_REVIEW_POLICY_STUB
 * で動かせる (空 overlay で merged.ts が throw しない bootstrap path 維持)。
 * 案件固有の override が必要な rule だけを明示的に書く。
 *
 * **canonical merge policy**:
 *   `aag/_internal/source-of-truth.md` §4 (Merge Policy)
 *   = 唯一の canonical。解決順序 / reviewPolicy 契約 / resolvedBy 追跡は
 *   §4.1〜§4.3 を参照。
 *
 * 合成ロジック: app/src/test/architectureRules/merged.ts (§4 implementation)
 *
 * 正本区分:
 * - App Domain: decisionCriteria, migrationRecipe, detection, binding, defaults
 * - Project Overlay（本ファイル）: fixNow, executionPlan, reviewPolicy, lifecyclePolicy
 *
 * 参照:
 * - aag/_internal/source-of-truth.md §4 (Merge Policy canonical)
 * - projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 * - references/03-implementation/governance-final-placement-plan.md
 *
 * @responsibility R:utility
 */

// `RuleExecutionOverlayEntry` / `ExecutionOverlay` 型は
// `app/src/test/aag-core-types.ts` に集約済 (Pilot A2a で三重定義解消)。
// 本 file は集約版を import + use する。
export type { RuleExecutionOverlayEntry, ExecutionOverlay } from '@/test/aag-core-types'

import type { ExecutionOverlay } from '@/test/aag-core-types'

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
