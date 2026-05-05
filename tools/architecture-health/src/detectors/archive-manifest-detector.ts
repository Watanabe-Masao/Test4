/**
 * Archive Manifest Detector — `aag-engine-readiness-refactor` Phase 3 demonstration
 *
 * **役割**: 5 系統 (= contracts / generated / project lifecycle / rule source / guard source)
 * のうち **archive manifest 系** に対する pure detector。aag-platformization Pilot で
 * landed された Archive v2 schema (`docs/contracts/aag/project-archive.schema.json`)
 * + 既存 production guard `archiveV2SchemaGuard.test.ts` の violation 経路の一部を
 * pure function で articulate する parallel implementation。
 *
 * **demonstration scope** (= Phase 3 で 4 系統 systematic adoption の 1 つ):
 *   - A2 (= manifest missing required top-level field) の判定経路を pure detector 化
 *   - 残り 9 violation code (A1 / A3〜A10) は Phase 6 (Pure Detector Extraction) で展開
 *
 * **不可侵原則**:
 *   - 本 detector は production の `archiveV2SchemaGuard.test.ts` を **置換しない**
 *   - A2 ruleId / sourceFile / severity は既存 guard violation 集合と **1:1 整合**
 *
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult TS contract)
 * @see app/src/test/guards/archiveV2SchemaGuard.test.ts (= 既存 production guard)
 * @see docs/contracts/aag/project-archive.schema.json (= Archive v2 schema 正本)
 */

import { createDetectorResult, type DetectorResult } from '../detector-result.js'
import { toRepoPath } from '../path-helpers.js'

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

/**
 * Archive v2 manifest の violation 検出に必要な input facts。
 *
 * 既存 collector / fs read 経路から articulate された facts を direct に取る。
 * 本 detector は fs / glob 依存を持たない (= pure)。
 */
export interface ArchiveManifestFacts {
  /** archived project の `archive.manifest.json` への repo-relative POSIX path */
  readonly manifestPath: string

  /** parsed manifest object (= JSON.parse 後)、null = 読み込み失敗 */
  readonly manifest: Readonly<Record<string, unknown>> | null
}

/**
 * Archive v2 manifest の **A2 = top-level required field 欠落** violation を
 * 検出する pure function。
 *
 * required field set (= `project-archive.schema.json` の `requiredManifestFields`):
 *   - archiveVersion / projectId / title / archivedAt / preCompressionCommit
 *   - deletedPaths / compressedFiles / restoreAllCommand / decisionEntries
 *   - commitLineage / relatedPrograms / compressionRationale
 *
 * (= 12 field、aag-platformization PR 4 で landed した Archive v2 schema)
 *
 * @param facts archive manifest facts の array
 * @returns DetectorResult[] (= 1 violation per missing field、空 array は違反なし)
 */
export function detectArchiveManifestViolations(
  facts: readonly ArchiveManifestFacts[],
): readonly DetectorResult[] {
  const REQUIRED_TOP_LEVEL_FIELDS = [
    'archiveVersion',
    'projectId',
    'title',
    'archivedAt',
    'preCompressionCommit',
    'deletedPaths',
    'compressedFiles',
    'restoreAllCommand',
    'decisionEntries',
    'commitLineage',
    'relatedPrograms',
    'compressionRationale',
  ] as const

  const results: DetectorResult[] = []

  for (const fact of facts) {
    if (fact.manifest === null) {
      // 読み込み失敗自体は本 detector の scope 外 (= collector layer の責務)
      continue
    }

    // path-helpers.toRepoPath() で sourceFile を boundary validate
    // (= aag-engine-readiness-refactor Phase 4 adoption)
    const sourceFile = toRepoPath(fact.manifestPath)

    for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
      if (!(field in fact.manifest)) {
        results.push(
          createDetectorResult({
            ruleId: 'AR-ARCHIVE-MANIFEST-A2',
            detectionType: 'governance-ops',
            sourceFile,
            severity: 'gate',
            evidence: `missing required field: ${field}`,
            messageSeed: `Archive v2 manifest が required top-level field '${field}' を持たない`,
          }),
        )
      }
    }
  }

  return Object.freeze(results)
}
