/**
 * Architecture Rules — Derived Merge
 *
 * App Domain（rules.ts の BASE_RULES）と Project Overlay（execution-overlay.ts）を
 * ruleId キーで合成して ARCHITECTURE_RULES を生成する。
 *
 * **canonical merge policy**:
 *   `aag/_internal/source-of-truth.md` §4 (Merge Policy)
 *   = **唯一の canonical**。本 file の合成 logic は §4 に back-link し、
 *     §4 と矛盾する挙動を持たない。merge policy を変更する場合は §4 を
 *     先に改訂し、本 file はそれに追従する (逆方向は禁止)。
 *
 * 合成方針 (= §4.1〜§4.2 の implementation):
 * - App Domain 側: semantics / governance / detection / binding
 * - Project Overlay 側: fixNow / executionPlan / reviewPolicy / lifecyclePolicy
 * - 解決順序 (§4.1): project overlay → defaults → 構造エラー
 * - reviewPolicy 契約 (§4.2): project overlay が未提供時は
 *   `DEFAULT_REVIEW_POLICY_STUB` (owner='unassigned' / lastReviewedAt=null /
 *   reviewCadenceDays=90) を補完 (bootstrap path 維持)
 * - resolvedBy 追跡 (§4.3): runtime には含めず、merged artifact (A2b deliverable)
 *   側で別途追跡
 *
 * consumer はこのファイル経由の ARCHITECTURE_RULES のみを見る。
 * rules.ts / execution-overlay.ts / defaults.ts を直接参照してはならない。
 *
 * defaults の完全性は defaultOverlayCompletenessGuard が保証する。
 * 参照: projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 *
 * @responsibility R:unclassified
 * @see aag/_internal/source-of-truth.md §4 (Merge Policy canonical)
 * @see references/03-guides/governance-final-placement-plan.md
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { DEFAULT_REVIEW_POLICY_STUB } from '@/test/aag-core-types'
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
 * `source-of-truth.md` §4 (Merge Policy canonical) の implementation。
 * 詳細は同 §4.1 解決順序 / §4.2 reviewPolicy 契約 を参照。
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
          `  → project overlay: ${ACTIVE_OVERLAY_HINT}\n` +
          `  → canonical merge policy: aag/_internal/source-of-truth.md §4`,
      )
    }
    // §4.1 解決順序: project overlay 優先、未定義 field は defaults から補完。
    const fixNow = projectOverlay?.fixNow ?? defaultOverlay!.fixNow
    const executionPlan = projectOverlay?.executionPlan ?? defaultOverlay!.executionPlan
    const lifecyclePolicy = projectOverlay?.lifecyclePolicy ?? defaultOverlay?.lifecyclePolicy
    // §4.2 reviewPolicy 契約: project overlay が未提供 → DEFAULT_REVIEW_POLICY_STUB
    // を補完。bootstrap path (空 EXECUTION_OVERLAY = {}) を維持しつつ、
    // 長期目標 = overlay 明示率 100% (本 program scope 外、後続 program で達成)。
    // stub 適用率は merged artifact (A2b) 側 resolvedBy で観測可能 (§4.3)。
    const reviewPolicy = projectOverlay?.reviewPolicy ?? DEFAULT_REVIEW_POLICY_STUB
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
