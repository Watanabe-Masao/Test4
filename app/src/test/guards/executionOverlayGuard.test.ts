/**
 * Execution Overlay Guard
 *
 * App Domain（rules.ts + defaults.ts）と Project Overlay（execution-overlay.ts）
 * の整合性を検証する。
 *
 * 検証項目:
 * 1. rules.ts の全 rule が effective overlay（project overlay + defaults）を持つ
 * 2. project overlay に未知の ruleId がない
 * 3. 全 rule が executionPlan を持つ（merge 後）
 * 4. 全 rule が fixNow を持つ（merge 後）
 * 5. project overlay の effort が有効値である
 * 6. project overlay の priority が非負整数である
 *
 * defaults の完全性は defaultOverlayCompletenessGuard が別途検証する。
 *
 * @responsibility R:unclassified
 * @see references/03-implementation/governance-final-placement-plan.md
 * @see projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules/merged'
import { ARCHITECTURE_RULES as BASE_RULES } from '../architectureRules/rules'
import { DEFAULT_EXECUTION_OVERLAY } from '../architectureRules/defaults'
import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'

describe('Execution Overlay Guard', () => {
  it('rules.ts の全 rule が effective overlay（project overlay ∪ defaults）を持つ', () => {
    const missing: string[] = []
    for (const rule of BASE_RULES) {
      if (!EXECUTION_OVERLAY[rule.id] && !DEFAULT_EXECUTION_OVERLAY[rule.id]) {
        missing.push(rule.id)
      }
    }
    expect(
      missing,
      'effective overlay 欠損ルール（project overlay または app/src/test/architectureRules/defaults.ts のいずれかに追加してください）',
    ).toEqual([])
  })

  it('overlay に未知の ruleId がない（orphan 検出）', () => {
    const knownIds = new Set(BASE_RULES.map((r) => r.id))
    const orphans: string[] = []
    for (const ruleId of Object.keys(EXECUTION_OVERLAY)) {
      if (!knownIds.has(ruleId)) {
        orphans.push(ruleId)
      }
    }
    expect(
      orphans,
      'overlay に存在するが rules.ts にない ruleId（overlay から削除してください）',
    ).toEqual([])
  })

  it('merge 後の全 rule が executionPlan を持つ', () => {
    const missing = ARCHITECTURE_RULES.filter(
      (r) => !r.executionPlan || !r.executionPlan.effort || r.executionPlan.priority == null,
    )
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('merge 後の全 rule が fixNow を持つ', () => {
    const missing = ARCHITECTURE_RULES.filter((r) => !r.fixNow)
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('overlay の effort が有効値 (provided 時のみ)', () => {
    // Pilot A2a: RuleExecutionOverlayEntry 型集約により全 field optional 化。
    // overlay が executionPlan を提供する場合のみ検証する (= 提供しない rule は
    // defaults から補完され、defaults 側は defaultOverlayCompletenessGuard で検証済)。
    const validEfforts = new Set(['trivial', 'small', 'medium'])
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(EXECUTION_OVERLAY)) {
      if (entry.executionPlan && !validEfforts.has(entry.executionPlan.effort)) {
        invalid.push(`${ruleId}: invalid effort '${entry.executionPlan.effort}'`)
      }
    }
    expect(invalid).toEqual([])
  })

  it('overlay の priority が非負整数 (provided 時のみ)', () => {
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(EXECUTION_OVERLAY)) {
      if (entry.executionPlan) {
        const p = entry.executionPlan.priority
        if (!Number.isInteger(p) || p < 0) {
          invalid.push(`${ruleId}: invalid priority ${p}`)
        }
      }
    }
    expect(invalid).toEqual([])
  })

  it('overlay の fixNow が有効値 (provided 時のみ)', () => {
    const validFixNow = new Set(['now', 'debt', 'review'])
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(EXECUTION_OVERLAY)) {
      if (entry.fixNow !== undefined && !validFixNow.has(entry.fixNow)) {
        invalid.push(`${ruleId}: invalid fixNow '${entry.fixNow}'`)
      }
    }
    expect(invalid).toEqual([])
  })
})
