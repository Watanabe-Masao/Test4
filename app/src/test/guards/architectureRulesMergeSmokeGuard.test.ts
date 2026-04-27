/**
 * Architecture Rules Merge / Facade Smoke Test（Phase 6-3）
 *
 * consumer が見る ARCHITECTURE_RULES 正本が、常に完全な配列を返すことを
 * 配線レベルで保証する。
 *
 * 既存の architectureRuleGuard / executionOverlayGuard は整合性検証だが、
 * 本テストは配線（merged.ts と facade が consumer に正しく届くか）に特化する。
 *
 * @guard F1 バレルで後方互換
 * @guard C6 facade は orchestration のみ
 * @see references/03-guides/governance-final-placement-plan.md
 *
 * @responsibility R:unclassified
 */
import { describe, expect, it } from 'vitest'
// 正本の 3 経路を個別に import する
import { ARCHITECTURE_RULES as FROM_BARREL } from '../architectureRules'
import { ARCHITECTURE_RULES as FROM_INDEX } from '../architectureRules/index'
import { ARCHITECTURE_RULES as FROM_MERGED } from '../architectureRules/merged'
import { ARCHITECTURE_RULES as FROM_BASE_RE_EXPORT } from '../architectureRules/rules'
// 互換 facade（架橋ファイル）
import { ARCHITECTURE_RULES as FROM_COMPAT_FACADE } from '../architectureRules.ts'

describe('Architecture Rules Merge / Facade Smoke', () => {
  it('facade, index, merged, rules re-export, 互換 facade はすべて同一参照 or 同一配列', () => {
    // 厳密な同一参照でなくてもよいが、件数と id 集合は一致すること
    const asIds = (arr: readonly { id: string }[]) => arr.map((r) => r.id).sort()
    const barrelIds = asIds(FROM_BARREL)
    const indexIds = asIds(FROM_INDEX)
    const mergedIds = asIds(FROM_MERGED)
    const reExportIds = asIds(FROM_BASE_RE_EXPORT)
    const compatIds = asIds(FROM_COMPAT_FACADE)

    expect(indexIds).toEqual(barrelIds)
    expect(mergedIds).toEqual(barrelIds)
    expect(reExportIds).toEqual(barrelIds)
    expect(compatIds).toEqual(barrelIds)
  })

  it('全 rule が fixNow を持つ（merge 後の完全性）', () => {
    const missing = FROM_BARREL.filter((r) => !r.fixNow).map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('全 rule が executionPlan を持つ（merge 後の完全性）', () => {
    const missing = FROM_BARREL.filter(
      (r) => !r.executionPlan || !r.executionPlan.effort || r.executionPlan.priority == null,
    ).map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('全 rule が migrationRecipe を持つ（BaseRule 由来の完全性）', () => {
    const missing = FROM_BARREL.filter(
      (r) => !r.migrationRecipe || r.migrationRecipe.steps.length === 0,
    ).map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('全 rule が decisionCriteria を持つ（BaseRule 由来の完全性）', () => {
    const missing = FROM_BARREL.filter((r) => !r.decisionCriteria).map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('rule id の重複がない', () => {
    const ids = FROM_BARREL.map((r) => r.id)
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dup).toEqual([])
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
    expect(FROM_BARREL.length).toBeGreaterThan(0)
  })

  it('merge 経路と base re-export が同じ件数（overlay 欠損が起きていないこと）', () => {
    // merged.ts が例外を投げずに配列を返せている = overlay 欠損がない
    expect(FROM_MERGED.length).toBe(FROM_BASE_RE_EXPORT.length)
  })
})
