/**
 * Architecture Rules Merge / Facade Smoke Test（Phase 6-3）
 *
 * consumer が見る ARCHITECTURE_RULES 正本が、常に完全な配列を返すことを
 * 配線レベルで保証する。
 *
 * 既存の architectureRuleGuard / executionOverlayGuard は整合性検証だが、
 * 本テストは配線（merged.ts と facade が consumer に正しく届くか）に特化する。
 *
 * **Phase D Wave 2 (2026-04-28)**: canonicalization-domain-consolidation Phase D で
 * `app-domain/integrity/` 経由の adapter 化。checkInclusion (5 経路 id 集合一致) +
 * checkUniqueness (id 重複) + checkNonEmpty (配線死亡) + checkSizeEquality
 * (overlay 欠損) + checkInclusionByPredicate (各 rule の必須 field) 経由に切替。
 * 動作同一性は 9 既存 test で検証済。
 *
 * @guard F1 バレルで後方互換
 * @guard C6 facade は orchestration のみ
 * @see references/03-guides/governance-final-placement-plan.md
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, expect, it } from 'vitest'
// 正本の 3 経路を個別に import する
import { ARCHITECTURE_RULES as FROM_BARREL } from '../architectureRules'
import { ARCHITECTURE_RULES as FROM_INDEX } from '../architectureRules/index'
import { ARCHITECTURE_RULES as FROM_MERGED } from '../architectureRules/merged'
import { ARCHITECTURE_RULES as FROM_BASE_RE_EXPORT } from '../architectureRules/rules'
// 互換 facade（架橋ファイル）
import { ARCHITECTURE_RULES as FROM_COMPAT_FACADE } from '../architectureRules.ts'
import {
  checkInclusion,
  checkUniqueness,
  checkNonEmpty,
  checkSizeEquality,
  checkInclusionByPredicate,
} from '@app-domain/integrity'

const RULE_ID = 'architectureRulesMergeSmokeGuard'

describe('Architecture Rules Merge / Facade Smoke', () => {
  it('facade, index, merged, rules re-export, 互換 facade はすべて同一参照 or 同一配列', () => {
    const asIdSet = (arr: readonly { id: string }[]) => new Set(arr.map((r) => r.id))
    const barrelIds = asIdSet(FROM_BARREL)
    const checks: Array<{ name: string; ids: ReadonlySet<string> }> = [
      { name: 'index', ids: asIdSet(FROM_INDEX) },
      { name: 'merged', ids: asIdSet(FROM_MERGED) },
      { name: 'reExport', ids: asIdSet(FROM_BASE_RE_EXPORT) },
      { name: 'compatFacade', ids: asIdSet(FROM_COMPAT_FACADE) },
    ]
    const violations: string[] = []
    for (const c of checks) {
      const reportsForward = checkInclusion(barrelIds, c.ids, {
        ruleId: RULE_ID,
        subsetLabel: 'barrel',
        supersetLabel: c.name,
      })
      const reportsBackward = checkInclusion(c.ids, barrelIds, {
        ruleId: RULE_ID,
        subsetLabel: c.name,
        supersetLabel: 'barrel',
      })
      for (const r of [...reportsForward, ...reportsBackward]) {
        violations.push(`${r.location} — ${r.actual}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('全 rule が fixNow を持つ（merge 後の完全性）', () => {
    const ruleIds = new Set(FROM_BARREL.map((r) => r.id))
    const violations = checkInclusionByPredicate(
      ruleIds,
      (id) => Boolean(FROM_BARREL.find((r) => r.id === id)?.fixNow),
      {
        ruleId: RULE_ID,
        subsetLabel: 'rules with fixNow',
        supersetLabel: 'fixNow 充足',
      },
    )
    expect(violations.map((v) => v.location)).toEqual([])
  })

  it('全 rule が executionPlan を持つ（merge 後の完全性）', () => {
    const ruleIds = new Set(FROM_BARREL.map((r) => r.id))
    const violations = checkInclusionByPredicate(
      ruleIds,
      (id) => {
        const rule = FROM_BARREL.find((r) => r.id === id)
        return Boolean(
          rule?.executionPlan && rule.executionPlan.effort && rule.executionPlan.priority != null,
        )
      },
      {
        ruleId: RULE_ID,
        subsetLabel: 'rules with executionPlan',
        supersetLabel: 'executionPlan 充足',
      },
    )
    expect(violations.map((v) => v.location)).toEqual([])
  })

  it('全 rule が migrationRecipe を持つ（BaseRule 由来の完全性）', () => {
    const ruleIds = new Set(FROM_BARREL.map((r) => r.id))
    const violations = checkInclusionByPredicate(
      ruleIds,
      (id) => {
        const rule = FROM_BARREL.find((r) => r.id === id)
        return Boolean(rule?.migrationRecipe && rule.migrationRecipe.steps.length > 0)
      },
      {
        ruleId: RULE_ID,
        subsetLabel: 'rules with migrationRecipe',
        supersetLabel: 'migrationRecipe 充足',
      },
    )
    expect(violations.map((v) => v.location)).toEqual([])
  })

  it('全 rule が decisionCriteria を持つ（BaseRule 由来の完全性）', () => {
    const ruleIds = new Set(FROM_BARREL.map((r) => r.id))
    const violations = checkInclusionByPredicate(
      ruleIds,
      (id) => Boolean(FROM_BARREL.find((r) => r.id === id)?.decisionCriteria),
      {
        ruleId: RULE_ID,
        subsetLabel: 'rules with decisionCriteria',
        supersetLabel: 'decisionCriteria 充足',
      },
    )
    expect(violations.map((v) => v.location)).toEqual([])
  })

  it('rule id の重複がない', () => {
    const violations = checkUniqueness(
      FROM_BARREL.map((r) => r.id),
      { ruleId: RULE_ID, registryLabel: 'ARCHITECTURE_RULES' },
    )
    expect(violations.map((v) => v.location)).toEqual([])
  })

  it('helpers（getRuleById / formatViolationMessage）が facade から取得できる', async () => {
    const mod = await import('../architectureRules')
    expect(typeof mod.getRuleById).toBe('function')
    expect(typeof mod.formatViolationMessage).toBe('function')
    // 代表ルールで round-trip
    const anyRule = FROM_BARREL[0]
    expect(mod.getRuleById(anyRule.id)?.id).toBe(anyRule.id)
  })

  it('ARCHITECTURE_RULES は空配列ではない（配線が死んでいないこと）', () => {
    const violations = checkNonEmpty(FROM_BARREL, {
      ruleId: RULE_ID,
      registryLabel: 'ARCHITECTURE_RULES',
    })
    expect(violations).toEqual([])
  })

  it('merge 経路と base re-export が同じ件数（overlay 欠損が起きていないこと）', () => {
    const violations = checkSizeEquality(FROM_MERGED.length, FROM_BASE_RE_EXPORT.length, {
      ruleId: RULE_ID,
      leftLabel: 'merged',
      rightLabel: 'base re-export',
    })
    expect(violations).toEqual([])
  })
})
