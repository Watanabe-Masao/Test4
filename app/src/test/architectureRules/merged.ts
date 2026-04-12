/**
 * Architecture Rules — Derived Merge
 *
 * App Domain（rules.ts の BASE_RULES）と Project Overlay（execution-overlay.ts）を
 * ruleId キーで合成して ARCHITECTURE_RULES を生成する。
 *
 * 合成方針:
 * - App Domain 側: semantics / governance / detection / binding
 * - Project Overlay 側: fixNow / executionPlan / reviewPolicy / lifecyclePolicy
 * - overlay 未定義のルールはエラー（default 補完しない）
 *
 * consumer はこのファイル経由の ARCHITECTURE_RULES のみを見る。
 * rules.ts と execution-overlay.ts の両方を直接参照してはならない。
 *
 * @responsibility R:utility
 * @see references/03-guides/governance-final-placement-plan.md
 */

import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { ARCHITECTURE_RULES as BASE_RULES } from './rules'
import type { ArchitectureRule } from './types'

/**
 * derived merge: App Domain（BaseRule）+ Project Overlay（RuleOperationalState）
 *
 * overlay 未定義は構造エラー（executionOverlayGuard でも別途検出する）。
 */
function mergeRules(): readonly ArchitectureRule[] {
  return BASE_RULES.map((rule): ArchitectureRule => {
    const overlay = EXECUTION_OVERLAY[rule.id]
    if (!overlay) {
      throw new Error(
        `[execution-overlay] Missing overlay for rule: ${rule.id}. ` +
          `All rules must have an execution overlay entry in ` +
          `projects/pure-calculation-reorg/aag/execution-overlay.ts`,
      )
    }
    return {
      ...rule,
      fixNow: overlay.fixNow,
      executionPlan: overlay.executionPlan,
      reviewPolicy: overlay.reviewPolicy,
      lifecyclePolicy: overlay.lifecyclePolicy,
    }
  })
}

/** 全 consumer が参照する正本 — merge 後の配列 */
export const ARCHITECTURE_RULES: readonly ArchitectureRule[] = mergeRules()
