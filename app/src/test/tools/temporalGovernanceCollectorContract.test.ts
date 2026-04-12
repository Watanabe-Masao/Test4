/**
 * Temporal Governance Collector 契約テスト（Phase 6-1）
 *
 * collector が fixture 期待値を返すことを固定する。
 *
 * 目的:
 * - `reviewPolicy.count` が overlay 内の reviewPolicy 定義数と一致
 * - `sunsetCondition.count` が BaseRule 内の sunsetCondition 定義数と一致
 * - `protectedHarm.count` が BaseRule 内の protectedHarm 定義数と一致
 * - `reviewOverdue.count` が lastReviewedAt + reviewCadenceDays から正しく算出
 * - `heuristicGate.count` が ruleClass + severity 組み合わせから正しく算出
 * - active-debt 系 KPI が allowlist を正しく読む
 *
 * @responsibility R:utility
 * @see references/03-guides/governance-final-placement-plan.md
 */
import { afterEach, describe, expect, it } from 'vitest'
import { collectFromTemporalGovernance } from '@tools/architecture-health/collectors/temporal-governance-collector'
import { createFixture, type Fixture } from './aagFixtureBuilder'

const findKpi = (kpis: ReturnType<typeof collectFromTemporalGovernance>, id: string) => {
  const kpi = kpis.find((k) => k.id === id)
  if (!kpi) throw new Error(`KPI ${id} not found`)
  return kpi
}

describe('Temporal Governance Collector 契約テスト', () => {
  let fx: Fixture | null = null
  afterEach(() => {
    fx?.cleanup()
    fx = null
  })

  it('reviewPolicy.count が overlay の reviewPolicy 定義数と一致する', () => {
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3', 'AR-4'],
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    // fixture の全ルールに reviewPolicy を付与しているため 4
    expect(findKpi(kpis, 'temporal.rules.reviewPolicy.count').value).toBe(4)
  })

  it('sunsetCondition.count が BaseRule 内の定義数と一致する（fixture: 1 件）', () => {
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3'],
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    // fixture builder は idx===0 のルールにのみ sunsetCondition を付与する
    expect(findKpi(kpis, 'temporal.rules.sunsetCondition.count').value).toBe(1)
  })

  it('protectedHarm.count が BaseRule 内の定義数と一致する（fixture: 2 件）', () => {
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3', 'AR-4'],
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    // fixture builder は idx===1 / idx===2 のルールに protectedHarm を付与する
    expect(findKpi(kpis, 'efficacy.rules.withProtectedHarm.count').value).toBe(2)
  })

  it('reviewOverdue.count が lastReviewedAt + cadence から正しく算出される', () => {
    // すでに期限切れの lastReviewedAt を overlay に仕込む
    const oldDate = '2020-01-01'
    const overlay = [
      'export const EXECUTION_OVERLAY = {',
      `  'AR-OLD': {`,
      `    fixNow: 'now',`,
      `    executionPlan: { effort: 'small', priority: 1 },`,
      `    reviewPolicy: {`,
      `      owner: 'fx',`,
      `      lastReviewedAt: '${oldDate}',`,
      `      reviewCadenceDays: 30,`,
      `    },`,
      `  },`,
      '};',
    ].join('\n')

    fx = createFixture({
      baseRuleIds: ['AR-OLD'],
      overrideFiles: {
        'projects/fx-project/aag/execution-overlay.ts': overlay,
      },
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'temporal.rules.reviewOverdue.count').value).toBe(1)
  })

  it('reviewOverdue.count が 0 のとき（新しい lastReviewedAt）', () => {
    const today = new Date().toISOString().slice(0, 10)
    const overlay = [
      'export const EXECUTION_OVERLAY = {',
      `  'AR-FRESH': {`,
      `    fixNow: 'now',`,
      `    executionPlan: { effort: 'small', priority: 1 },`,
      `    reviewPolicy: {`,
      `      owner: 'fx',`,
      `      lastReviewedAt: '${today}',`,
      `      reviewCadenceDays: 365,`,
      `    },`,
      `  },`,
      '};',
    ].join('\n')

    fx = createFixture({
      baseRuleIds: ['AR-FRESH'],
      overrideFiles: {
        'projects/fx-project/aag/execution-overlay.ts': overlay,
      },
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'temporal.rules.reviewOverdue.count').value).toBe(0)
  })

  it('heuristicGate.count が ruleClass=heuristic + severity=gate から算出される', () => {
    // fixture builder は idx===3（4番目）を heuristic/gate にする
    fx = createFixture({
      baseRuleIds: ['AR-1', 'AR-2', 'AR-3', 'AR-4-HEUR', 'AR-5'],
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'temporal.rules.heuristicGate.count').value).toBe(1)
  })

  it('allowlist active-debt count が 0（fixture の allowlist は空）', () => {
    fx = createFixture()
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'temporal.allowlist.activeDebt.count').value).toBe(0)
    expect(findKpi(kpis, 'temporal.allowlist.activeDebt.withCreatedAt').value).toBe(0)
  })

  it('allowlist active-debt を含む場合に数が上がる', () => {
    fx = createFixture({
      overrideFiles: {
        'app/src/test/allowlists/architecture.ts': [
          '// fixture active-debt',
          "const entry1 = { lifecycle: 'active-debt', createdAt: '2025-01-01' }",
          "const entry2 = { lifecycle: 'active-debt' }",
          'export { entry1, entry2 }',
        ].join('\n'),
      },
    })
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'temporal.allowlist.activeDebt.count').value).toBe(2)
    expect(findKpi(kpis, 'temporal.allowlist.activeDebt.withCreatedAt').value).toBe(1)
  })

  it('implRefs が物理正本を指している', () => {
    fx = createFixture()
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    const sunset = findKpi(kpis, 'temporal.rules.sunsetCondition.count')
    expect(sunset.implRefs).toContain('app-domain/gross-profit/rule-catalog/base-rules.ts')
    const reviewOverdue = findKpi(kpis, 'temporal.rules.reviewOverdue.count')
    // resolver 経由で project overlay の相対パスが返ること
    expect(reviewOverdue.implRefs[0]).toMatch(/projects\/.*\/aag\/execution-overlay\.ts$/)
  })

  it('high-noise ルール数（≥10 例外）が 0 — fixture は例外なし', () => {
    fx = createFixture()
    const kpis = collectFromTemporalGovernance(fx.repoRoot)
    expect(findKpi(kpis, 'efficacy.rules.highNoise.count').value).toBe(0)
  })
})
