/**
 * Guard Collector 契約テスト（Phase 6-1）
 *
 * collector が fixture 期待値を返すことを固定する。
 *
 * 目的:
 * - `guard.rules.total` が BaseRule 数と一致する
 * - `fixNow=now/debt/review` 件数が overlay の fixNow 分布と一致する
 * - single quote / double quote の両方で結果が崩れない
 * - implRefs が現在の物理正本（app-domain + project overlay）を指す
 *
 * 本テストは collector の内部 regex ではなく、KPI 出力結果を契約として固定する。
 *
 * @responsibility R:unclassified
 * @see references/03-implementation/governance-final-placement-plan.md
 *
 * @taxonomyKind T:unclassified
 */
import { afterEach, describe, expect, it } from 'vitest'
import { collectFromGuards } from '@tools/architecture-health/collectors/guard-collector'
import { createFixture, type Fixture } from './aagFixtureBuilder'

describe('Guard Collector 契約テスト', () => {
  let fx: Fixture | null = null
  afterEach(() => {
    fx?.cleanup()
    fx = null
  })

  const findKpi = (kpis: ReturnType<typeof collectFromGuards>, id: string) => {
    const kpi = kpis.find((k) => k.id === id)
    if (!kpi) throw new Error(`KPI ${id} not found`)
    return kpi
  }

  it('guard.rules.total が BaseRule 数と一致する（single quote）', () => {
    fx = createFixture({
      baseRuleIds: ['AR-FX-1', 'AR-FX-2', 'AR-FX-3', 'AR-FX-4', 'AR-FX-5'],
      quoteStyle: 'single',
    })
    const kpis = collectFromGuards(fx.repoRoot)
    expect(findKpi(kpis, 'guard.rules.total').value).toBe(5)
  })

  it('guard.rules.total が BaseRule 数と一致する（double quote — quote-agnostic 検証）', () => {
    // collector の id 検出は quote-agnostic であること。
    // Prettier が single/double どちらで書き出しても同じ値を返す。
    fx = createFixture({
      baseRuleIds: ['AR-FX-1', 'AR-FX-2', 'AR-FX-3'],
      quoteStyle: 'double',
    })
    const kpis = collectFromGuards(fx.repoRoot)
    expect(findKpi(kpis, 'guard.rules.total').value).toBe(3)
  })

  it('fixNow 分布が overlay 内容と一致する（single quote）', () => {
    // 5 rules → indices 0..4, fixNow = [now, debt, review, now, debt]
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5'],
      quoteStyle: 'single',
    })
    const kpis = collectFromGuards(fx.repoRoot)
    expect(findKpi(kpis, 'guard.rules.fixNow.now').value).toBe(2)
    expect(findKpi(kpis, 'guard.rules.fixNow.debt').value).toBe(2)
    expect(findKpi(kpis, 'guard.rules.fixNow.review').value).toBe(1)
  })

  it('fixNow 分布が overlay 内容と一致する（double quote — quote-agnostic 検証）', () => {
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3'],
      quoteStyle: 'double',
    })
    const kpis = collectFromGuards(fx.repoRoot)
    // 3 rules → [now, debt, review]
    expect(findKpi(kpis, 'guard.rules.fixNow.now').value).toBe(1)
    expect(findKpi(kpis, 'guard.rules.fixNow.debt').value).toBe(1)
    expect(findKpi(kpis, 'guard.rules.fixNow.review').value).toBe(1)
  })

  it('implRefs が物理正本を指している', () => {
    fx = createFixture()
    const kpis = collectFromGuards(fx.repoRoot)
    const total = findKpi(kpis, 'guard.rules.total')
    expect(total.implRefs).toContain('app-domain/gross-profit/rule-catalog/base-rules.ts')
  })

  it('guard.files.count がガードファイル数と一致する', () => {
    fx = createFixture({
      extraFiles: {
        'app/src/test/guards/another.test.ts': '// another',
        'app/src/test/guards/third.test.ts': '// third',
      },
    })
    const kpis = collectFromGuards(fx.repoRoot)
    // fixture の既定で 1 ファイル（sample.test.ts）+ extra 2 = 3
    expect(findKpi(kpis, 'guard.files.count').value).toBe(3)
  })

  it('guard.reviewOnlyTags.count が REVIEW_ONLY_TAGS 長さと一致する', () => {
    fx = createFixture({
      overrideFiles: {
        'app/src/test/guardTagRegistry.ts':
          "export const REVIEW_ONLY_TAGS = ['A1', 'A2', 'A3', 'A4']\n",
      },
    })
    const kpis = collectFromGuards(fx.repoRoot)
    expect(findKpi(kpis, 'guard.reviewOnlyTags.count').value).toBe(4)
  })

  it('project 切替点の変更に追随する（resolver 経由）', () => {
    // 別 project id の fixture を作る → 同じ collector が新 id の overlay を読める
    fx = createFixture({
      projectId: 'other-project',
      baseRuleIds: ['AR-X', 'AR-Y', 'AR-Z'],
    })
    const kpis = collectFromGuards(fx.repoRoot)
    expect(findKpi(kpis, 'guard.rules.total').value).toBe(3)
    // fixNow 分布: [now, debt, review]
    expect(findKpi(kpis, 'guard.rules.fixNow.now').value).toBe(1)
  })
})
