/**
 * Architecture Rules — Derived Merge
 *
 * App Domain（rules.ts の BASE_RULES）と Project Overlay（execution-overlay.ts）を
 * ruleId キーで合成して ARCHITECTURE_RULES を生成する。
 *
 * 合成方針:
 * - App Domain 側: semantics / governance / detection / binding
 * - Project Overlay 側: fixNow / executionPlan / reviewPolicy / lifecyclePolicy
 * - overlay 未定義のルールは DEFAULT_EXECUTION_OVERLAY（App Domain の defaults）
 *   から値を取る。どちらにもなければ構造エラー。
 * - project overlay は defaults よりも優先される（override）
 *
 * consumer はこのファイル経由の ARCHITECTURE_RULES のみを見る。
 * rules.ts / execution-overlay.ts / defaults.ts を直接参照してはならない。
 *
 * defaults の完全性は defaultOverlayCompletenessGuard が保証する。
 * 参照: projects/aag-format-redesign/overlay-bootstrap-design.md
 *
 * @responsibility R:utility
 * @see references/03-guides/governance-final-placement-plan.md
 */

import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { DEFAULT_EXECUTION_OVERLAY } from './defaults'
import { ARCHITECTURE_RULES as BASE_RULES } from './rules'
import type { ArchitectureRule } from './types'

/**
 * derived merge: App Domain（BaseRule）+ Project Overlay（RuleOperationalState）
 *
 * 解決順序:
 *   1. project overlay（EXECUTION_OVERLAY）
 *   2. app-domain defaults（DEFAULT_EXECUTION_OVERLAY）
 *   3. どちらにもなければ構造エラー
 *
 * project overlay は defaults の fixNow / executionPlan / lifecyclePolicy を
 * 個別に上書きできる（reviewPolicy は defaults に存在しないので常に project
 * overlay のものが使われる）。
 */
function mergeRules(): readonly ArchitectureRule[] {
  return BASE_RULES.map((rule): ArchitectureRule => {
    const projectOverlay = EXECUTION_OVERLAY[rule.id]
    const defaultOverlay = DEFAULT_EXECUTION_OVERLAY[rule.id]
    if (!projectOverlay && !defaultOverlay) {
      throw new Error(
        `[execution-overlay] Missing overlay for rule: ${rule.id}. ` +
          `Either project overlay (EXECUTION_OVERLAY) or ` +
          `DEFAULT_EXECUTION_OVERLAY must define it. ` +
          `See: app/src/test/architectureRules/defaults.ts`,
      )
    }
    // project overlay が明示的に定義されていれば各フィールドで優先、
    // 未定義フィールドは defaults から補完する。
    const fixNow = projectOverlay?.fixNow ?? defaultOverlay!.fixNow
    const executionPlan = projectOverlay?.executionPlan ?? defaultOverlay!.executionPlan
    const lifecyclePolicy = projectOverlay?.lifecyclePolicy ?? defaultOverlay?.lifecyclePolicy
    const reviewPolicy = projectOverlay?.reviewPolicy
    return {
      ...rule,
      fixNow,
      executionPlan,
      reviewPolicy,
      lifecyclePolicy,
    }
  })
}

/** 全 consumer が参照する正本 — merge 後の配列 */
export const ARCHITECTURE_RULES: readonly ArchitectureRule[] = mergeRules()
