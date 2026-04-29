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
 * 参照: projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 *
 * @responsibility R:unclassified
 * @see references/03-guides/governance-final-placement-plan.md
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { DEFAULT_EXECUTION_OVERLAY } from './defaults'
import { ARCHITECTURE_RULES as BASE_RULES } from './rules'
import type { ArchitectureRule } from './types'

/**
 * Phase K Option 1 後続 C (2026-04-29):
 * `CURRENT_PROJECT.md` から active project id を読み取って error message に含める。
 * 「どの project の execution-overlay.ts に追加すべきか」を runtime hint として
 * 明示することで、wrong project への AR rule 追加事故を防ぐ (本セッションで遭遇した
 * `phased-content-specs-rollout` vs `pure-calculation-reorg` の混乱を予防)。
 *
 * 失敗時 (CURRENT_PROJECT.md が読めない / parse 失敗) は null を返し、error message は
 * 従来の汎用文字列で fall back する (本 helper は hint であり mechanism の必須要素ではない)。
 */
function getActiveProjectId(): string | null {
  try {
    // app/src/test/architectureRules/merged.ts → repo root は ../../../..
    const repoRoot = resolve(__dirname, '../../../..')
    const content = readFileSync(resolve(repoRoot, 'CURRENT_PROJECT.md'), 'utf-8')
    const match = content.match(/^active:\s*([^\s]+)\s*$/m)
    return match ? match[1] : null
  } catch {
    return null
  }
}

const ACTIVE_PROJECT_ID = getActiveProjectId()
const ACTIVE_OVERLAY_HINT = ACTIVE_PROJECT_ID
  ? `projects/${ACTIVE_PROJECT_ID}/aag/execution-overlay.ts (active project per CURRENT_PROJECT.md)`
  : 'projects/<active-project>/aag/execution-overlay.ts (active project は CURRENT_PROJECT.md 参照)'

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
          `DEFAULT_EXECUTION_OVERLAY must define it.\n` +
          `  → defaults: app/src/test/architectureRules/defaults.ts\n` +
          `  → project overlay: ${ACTIVE_OVERLAY_HINT}`,
      )
    }
    // project overlay が明示的に定義されていれば各フィールドで優先、
    // 未定義フィールドは defaults から補完する。
    const fixNow = projectOverlay?.fixNow ?? defaultOverlay!.fixNow
    const executionPlan = projectOverlay?.executionPlan ?? defaultOverlay!.executionPlan
    const lifecyclePolicy = projectOverlay?.lifecyclePolicy ?? defaultOverlay?.lifecyclePolicy
    // ADR-D-001 PR3 (2026-04-24): RuleOperationalState.reviewPolicy は required。
    // defaults には reviewPolicy が無い（案件固有の時刻フィールドのため）ので、
    // project overlay が必ず提供する。未提供は構造エラー。
    const reviewPolicy = projectOverlay?.reviewPolicy
    if (!reviewPolicy) {
      throw new Error(
        `[execution-overlay] Missing reviewPolicy for rule: ${rule.id}. ` +
          `Project overlay (EXECUTION_OVERLAY) must provide reviewPolicy ` +
          `(owner / lastReviewedAt / reviewCadenceDays) for all rules.\n` +
          `  → 修正先: ${ACTIVE_OVERLAY_HINT}\n` +
          `  → 参考実装: projects/completed/architecture-debt-recovery/aag/execution-overlay.ts`,
      )
    }
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
