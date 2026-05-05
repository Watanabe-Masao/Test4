/**
 * Generated Metadata Detector — `aag-engine-readiness-refactor` Phase 3 demonstration
 *
 * **役割**: 5 系統のうち **generated artifact metadata 系** に対する pure detector。
 * 既存 production guard `generatedFileEditGuard.test.ts` (= G1〜G3 = 命名規約 +
 * 手編集検出 + scope) の violation 経路の一部を pure function で articulate する
 * parallel implementation。
 *
 * **demonstration scope**:
 *   - G2 (= `*.generated.md` が GENERATED marker / ISO timestamp token を含まない) の判定を pure 化
 *   - G1 / G3 (= 命名規約 + scope) は Phase 6 で展開
 *
 * **不可侵原則**:
 *   - 本 detector は production guard を **置換しない**
 *   - G2 ruleId / sourceFile / severity は既存 guard violation 集合と **1:1 整合**
 *
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult TS contract)
 * @see app/src/test/guards/generatedFileEditGuard.test.ts (= 既存 production guard)
 */

import { createDetectorResult, type DetectorResult } from '../detector-result.js'

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

/**
 * generated metadata violation 検出に必要な input facts。
 *
 * collector layer から articulate された facts (= file path + content) を direct に取る。
 */
export interface GeneratedMetadataFacts {
  /** `*.generated.md` files (= path + 全 content) */
  readonly files: readonly { readonly path: string; readonly content: string }[]
}

/**
 * `*.generated.md` の **G2 = GENERATED marker / ISO timestamp 欠落** violation を
 * 検出する pure function。
 *
 * 検出 pattern:
 *   - GENERATED marker (= `> 生成: <ISO timestamp>` または `<!-- GENERATED` 等)
 *   - ISO timestamp (= `YYYY-MM-DDTHH:MM:SS` format token)
 *
 * 両方とも欠落していれば **手編集の疑い** として violation emit。
 *
 * @param facts generated metadata facts
 * @returns DetectorResult[] (= 1 violation per file missing both markers)
 */
export function detectGeneratedMetadataViolations(
  facts: GeneratedMetadataFacts,
): readonly DetectorResult[] {
  // GENERATED marker patterns (= production guard と整合)
  const GENERATED_MARKER_PATTERN = /(>\s*生成:|<!--\s*GENERATED|GENERATED:START)/
  const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

  const results: DetectorResult[] = []

  for (const file of facts.files) {
    const hasMarker = GENERATED_MARKER_PATTERN.test(file.content)
    const hasTimestamp = ISO_TIMESTAMP_PATTERN.test(file.content)

    if (!hasMarker && !hasTimestamp) {
      results.push(
        createDetectorResult({
          ruleId: 'AR-GENERATED-METADATA-G2',
          detectionType: 'governance-ops',
          sourceFile: file.path,
          severity: 'gate',
          evidence: 'no GENERATED marker AND no ISO timestamp',
          messageSeed: `*.generated.md '${file.path}' が GENERATED marker / ISO timestamp を含まない (= 手編集の疑い)`,
        }),
      )
    }
  }

  return Object.freeze(results)
}
