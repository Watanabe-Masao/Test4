/**
 * Content Spec Canonical Registration Sync Guard — AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC
 *
 * Phase D Step 2 (2026-04-28): kind=calculation の spec について、frontmatter の
 * `canonicalRegistration` と `calculationCanonRegistry.ts` の `runtimeStatus` が
 * **完全一致** していることを双方向に検証する。
 *
 * 不可侵原則:
 *   - registry が「current」と分類した calc の spec が `canonicalRegistration: candidate`
 *     などになっていたら hard fail（user 質問の核心: spec ↔ registry 乖離禁止）
 *   - registry に entry がない calc の spec は spec 側を疑う（孤立 spec）
 *
 * Promote Ceremony との整合:
 *   1 PR で registry の `runtimeStatus` を更新し、spec の `canonicalRegistration` を
 *   同期更新することを **本 guard が強制** する。片方だけ更新したら hard fail。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §5.4 Lifecycle State Machine,
 * references/03-guides/promote-ceremony-pr-template.md.
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
import { loadAllSpecs } from './contentSpecHelpers'

describe('Content Spec Canonical Registration Sync Guard (AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC)', () => {
  it('全 calculation spec の canonicalRegistration が calculationCanonRegistry.runtimeStatus と一致する', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (spec.kind !== 'calculation') continue
      // sourceRef は `app/src/domain/calculations/<file>.ts` 形式。
      // registry の key は `<file>.ts` または `candidate/<file>.ts`。
      const sourceRef = spec.sourceRef
      const m = sourceRef.match(/^app\/src\/domain\/calculations\/(.+)$/)
      if (!m) {
        violations.push(
          `${spec.id}: sourceRef='${sourceRef}' は app/src/domain/calculations/ 配下でない`,
        )
        continue
      }
      const registryKey = m[1]
      const registryEntry = CALCULATION_CANON_REGISTRY[registryKey]
      if (!registryEntry) {
        violations.push(
          `${spec.id}: registryKey='${registryKey}' が calculationCanonRegistry に未登録 (孤立 spec)`,
        )
        continue
      }
      const expected = registryEntry.runtimeStatus ?? null
      const actual = spec.canonicalRegistration
      // registry の runtimeStatus が optional の場合は spec 側も null/未設定で一致を許容
      if (expected == null && actual == null) continue
      if (expected !== actual) {
        violations.push(
          `${spec.id}: canonicalRegistration drift — spec='${actual}', registry='${expected}' (${registryKey}). ` +
            `Promote Ceremony PR (references/03-guides/promote-ceremony-pr-template.md) で 1 PR 同期更新すること`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('calculationCanonRegistry の current/candidate entry に対応する CALC spec が存在する (孤立 entry 検出)', () => {
    // Phase D は 6 件 cover (CALC-001〜006) で BIZ-008〜013 まで。registry には他にも
    // current/candidate entry が存在しうる（dowGapAnalysis 等）。本 guard は段階展開のため、
    // baseline で既知未 cover を許容しつつ ratchet-down で 0 を目指す。
    //
    // baseline: registry に current/candidate として存在するが CALC spec が無い entry の数。
    // Phase D Step 3 (2026-04-28) 時点で:
    //   - cover 済 (CALC spec あり、11 件): customerGap / piValue / inventoryCalc /
    //     pinIntervals / observationPeriod / remainingBudgetRate (Step 1+2、tier1) +
    //     factorDecomposition / forecast / invMethod / estMethod / budgetAnalysis (Step 3、tier2)
    //   - 未 cover (24 件): tier3 系の analytic-authoritative + utility +
    //     candidate-authoritative。内訳: discountImpact / prevYearCostApprox /
    //     costAggregation / markupRate / timeSlotCalculations / budgetSimulator /
    //     budgetSimulatorAggregations / dowGapAnalysis / algorithms/* (4) /
    //     temporal/* (1) / candidate/* (10、物理 file 未生成)
    //
    // candidate/* は物理 file 未生成のため CALC spec も未生成（lifecycleStatus: proposed
    // で先行 spec 化することは可能だが Phase D Step 4+ scope）。
    // ratchet-down 戦略: Phase D Step 4+ で tier3 候補を順次 spec 化し baseline を 0 に近づける。
    const SPEC_COVERAGE_BASELINE = 24
    const specSourceRefs = new Set<string>()
    for (const spec of loadAllSpecs()) {
      if (spec.kind !== 'calculation') continue
      const m = spec.sourceRef.match(/^app\/src\/domain\/calculations\/(.+)$/)
      if (m) specSourceRefs.add(m[1])
    }
    const uncovered: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      const isCurrentOrCandidate =
        entry.runtimeStatus === 'current' || entry.runtimeStatus === 'candidate'
      if (!isCurrentOrCandidate) continue
      if (!specSourceRefs.has(key)) uncovered.push(key)
    }
    expect(
      uncovered.length,
      `未 cover ${uncovered.length} / baseline ${SPEC_COVERAGE_BASELINE}\n  uncovered: ${uncovered.join(', ')}\n  ratchet-down: baseline 以上に増やしてはいけない`,
    ).toBeLessThanOrEqual(SPEC_COVERAGE_BASELINE)
  })
})
