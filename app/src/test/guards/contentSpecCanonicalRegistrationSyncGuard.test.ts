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
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
import { loadAllSpecs, REPO_ROOT } from './contentSpecHelpers'

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

  it('calculationCanonRegistry の current/active-candidate entry に対応する CALC spec が存在する (孤立 entry 検出)', () => {
    // 本 guard は **物理 source が存在する** registry entry のみを spec 必須対象とする。
    //
    // 設計理由 (Phase D Step 7、2026-04-28 institutionalize):
    //   candidate slot は 2 状態を持つ:
    //     1. **planning-only** — registry に slot のみ登録、対応 .ts file は未生成。
    //        WASM module は存在し将来の TS wrapper を anticipate する slot
    //     2. **active candidate** — physical .ts file が存在し dual-run 中
    //
    //   spec は「物理実装の事実台帳」(05-contents/README.md) なので、planning-only slot は
    //   coverage 要件から exempt。physical landing が起きた瞬間、その file は active
    //   candidate 化し本 guard が「+1 over baseline」で hard fail させる (Promote Ceremony
    //   着手の自然な trigger)。
    //
    // baseline = 0 は **絶対不可侵**。new physical candidate が landing したのに spec が
    //   無ければ即 fail。current entry に spec が無い場合も即 fail。
    //
    // Phase D Step 7 (2026-04-28) 時点で:
    //   - cover 済 (24 件): current 全件 (CALC-001〜024)
    //   - active candidate (0 件): physical .ts 存在の candidate は今のところ無い
    //   - planning-only candidate (11 件): candidate/* 全て (sensitivity / correlation /
    //     trendAnalysis / computeMovingAverage / piValue / inventoryCalc / pinIntervals /
    //     observationPeriod / remainingBudgetRate / customerGap / dowGapAnalysis、
    //     対応 WASM module は存在)
    //
    // Promote Ceremony 着手 = candidate file の physical landing。その PR で spec も
    // 同時 landing しないと本 guard が hard fail させる (1 PR 5 同期の機械強制)。
    const SPEC_COVERAGE_BASELINE = 0
    const specSourceRefs = new Set<string>()
    for (const spec of loadAllSpecs()) {
      if (spec.kind !== 'calculation') continue
      const m = spec.sourceRef.match(/^app\/src\/domain\/calculations\/(.+)$/)
      if (m) specSourceRefs.add(m[1])
    }
    const uncovered: string[] = []
    const planningOnly: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      const isCurrentOrCandidate =
        entry.runtimeStatus === 'current' || entry.runtimeStatus === 'candidate'
      if (!isCurrentOrCandidate) continue
      if (specSourceRefs.has(key)) continue
      // physical source の存在で active candidate / planning-only を判定
      const physicalPath = resolve(REPO_ROOT, 'app/src/domain/calculations', key)
      if (existsSync(physicalPath)) {
        uncovered.push(key)
      } else {
        planningOnly.push(key)
      }
    }
    expect(
      uncovered.length,
      `未 cover (active candidate or current) ${uncovered.length} / baseline ${SPEC_COVERAGE_BASELINE}\n` +
        `  uncovered: ${uncovered.join(', ')}\n` +
        `  planning-only (informational, exempt): ${planningOnly.length} 件\n` +
        `  spec は物理実装の事実台帳。physical landing 時に同 PR で spec を必ず添付すること`,
    ).toBeLessThanOrEqual(SPEC_COVERAGE_BASELINE)
  })

  it('planning-only candidate slot 数が登録済み件数と一致する (informational)', () => {
    // planning-only counter の drift 検出。registry に新 candidate slot を追加 / 削除
    // するときに人間レビュー必要であることを informational に強制する。
    // expected 値は registry に candidate/* slot を増減させたら同 PR で本数を更新する運用。
    const PLANNING_ONLY_EXPECTED = 11
    const specSourceRefs = new Set<string>()
    for (const spec of loadAllSpecs()) {
      if (spec.kind !== 'calculation') continue
      const m = spec.sourceRef.match(/^app\/src\/domain\/calculations\/(.+)$/)
      if (m) specSourceRefs.add(m[1])
    }
    let planningOnlyCount = 0
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      if (entry.runtimeStatus !== 'candidate') continue
      if (specSourceRefs.has(key)) continue
      const physicalPath = resolve(REPO_ROOT, 'app/src/domain/calculations', key)
      if (!existsSync(physicalPath)) planningOnlyCount++
    }
    expect(
      planningOnlyCount,
      `planning-only candidate count drift — actual=${planningOnlyCount}, expected=${PLANNING_ONLY_EXPECTED}. ` +
        `registry に candidate/* slot を増減させたら本値を同 PR で更新すること`,
    ).toBe(PLANNING_ONLY_EXPECTED)
  })
})
