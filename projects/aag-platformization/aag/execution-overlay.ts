/**
 * aag-platformization Pilot Overlay — 空 overlay
 *
 * 本 program (= Standard Pilot) は本体 merge に参加しない (空 overlay 維持)。
 * 全 rule は DEFAULT_EXECUTION_OVERLAY + DEFAULT_REVIEW_POLICY_STUB から解決。
 *
 * **canonical merge policy**:
 *   `references/01-principles/aag/source-of-truth.md` §4 (Merge Policy)
 *   = 唯一の canonical。解決順序 / reviewPolicy 契約 / resolvedBy 追跡は
 *   §4.1〜§4.3 を参照。
 *
 * 合成ロジック: app/src/test/architectureRules/merged.ts (§4 implementation)
 *
 * @responsibility R:utility
 * @see references/01-principles/aag/source-of-truth.md §4 (Merge Policy canonical)
 */

// `RuleExecutionOverlayEntry` / `ExecutionOverlay` 型は
// `app/src/test/aag-core-types.ts` に集約済 (Pilot A2a で三重定義解消)。
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
