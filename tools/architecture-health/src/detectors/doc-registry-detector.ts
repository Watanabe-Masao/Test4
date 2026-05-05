/**
 * Doc Registry Detector — `aag-engine-readiness-refactor` Phase 3 demonstration
 *
 * **役割**: 5 系統のうち **doc registry 系** に対する pure detector。既存
 * production guard `docRegistryGuard.test.ts` (= 「レジストリに登録された全文書が
 * 存在する」等 6 violation rule) の violation 経路の一部を pure function で
 * articulate する parallel implementation。
 *
 * **demonstration scope**:
 *   - D1 (= registry に登録された path が file system に存在しない) の判定経路を pure detector 化
 *   - 残り 5 violation rule (= category coverage / README symmetry / 等) は Phase 6 で展開
 *
 * **不可侵原則**:
 *   - 本 detector は production guard を **置換しない**
 *   - D1 ruleId / sourceFile / severity は既存 guard violation 集合と **1:1 整合**
 *
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult TS contract)
 * @see app/src/test/guards/docRegistryGuard.test.ts (= 既存 production guard)
 * @see docs/contracts/doc-registry.json (= registry 正本)
 */

import { createDetectorResult, type DetectorResult } from '../detector-result.js'
import { toRepoPath } from '../path-helpers.js'

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

/**
 * doc registry violation 検出に必要な input facts。
 *
 * collector layer から articulate された facts を direct に取る (= pure)。
 */
export interface DocRegistryFacts {
  /** registry に登録された entry 集合 (= path + label のペア) */
  readonly entries: readonly { readonly path: string; readonly label: string }[]

  /** 実存する file path 集合 (= filesystem read 後の collector output) */
  readonly existingPaths: ReadonlySet<string>
}

/**
 * doc registry の **D1 = registered path が存在しない** violation を検出する pure function。
 *
 * @param facts doc registry facts (= entries + existingPaths)
 * @returns DetectorResult[] (= 1 violation per non-existent registered path)
 */
export function detectDocRegistryViolations(
  facts: DocRegistryFacts,
): readonly DetectorResult[] {
  const results: DetectorResult[] = []

  for (const entry of facts.entries) {
    if (!facts.existingPaths.has(entry.path)) {
      results.push(
        createDetectorResult({
          ruleId: 'AR-DOC-REGISTRY-D1',
          detectionType: 'governance-ops',
          // path-helpers.toRepoPath() で sourceFile を boundary validate
          // (= aag-engine-readiness-refactor Phase 4 adoption)
          sourceFile: toRepoPath(entry.path),
          severity: 'gate',
          evidence: `registered label: ${entry.label}`,
          messageSeed: `doc registry に登録された path '${entry.path}' が file system に存在しない`,
        }),
      )
    }
  }

  return Object.freeze(results)
}
