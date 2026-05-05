/**
 * Schema Validation Detector — `aag-engine-readiness-refactor` Phase 3 demonstration
 *
 * **役割**: 5 系統のうち **schema validation 系** に対する pure detector。既存
 * production guard `projectizationPolicyGuard.test.ts` (= PZ-1〜PZ-14、AAG-COA
 * 判定の機械検証) の violation 経路の一部を pure function で articulate する
 * parallel implementation。
 *
 * **demonstration scope**:
 *   - PZ-2 (= `projectization.level` が 0〜4 の範囲外) の判定経路を pure detector 化
 *   - 残り 13 violation rule (PZ-1 / PZ-3〜PZ-14) は Phase 6 で展開
 *
 * **不可侵原則**:
 *   - 本 detector は production guard を **置換しない**
 *   - PZ-2 ruleId / sourceFile / severity は既存 guard violation 集合と **1:1 整合**
 *
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult TS contract)
 * @see app/src/test/guards/projectizationPolicyGuard.test.ts (= 既存 production guard)
 * @see references/05-aag-interface/operations/projectization-policy.md (= AAG-COA 正本)
 */

import { createDetectorResult, type DetectorResult } from '../detector-result.js'
import { toRepoPath } from '../path-helpers.js'

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

/**
 * schema validation violation 検出に必要な input facts。
 *
 * collector layer から articulate された facts (= projectization metadata 抽出後) を direct に取る。
 */
export interface SchemaValidationFacts {
  /** project ごとの projectization metadata 抽出結果 */
  readonly projects: readonly {
    readonly projectId: string
    readonly configPath: string
    /** `projectization.level` の生値 (= number 以外なら null) */
    readonly level: number | null
  }[]
}

/**
 * projectization の **PZ-2 = level が 0〜4 の範囲外** violation を検出する pure function。
 *
 * AAG-COA Level 定義 (= projectization-policy.md §3):
 *   - 0 = Task / 1 = Lightweight Project / 2 = Standard Project /
 *   - 3 = Architecture Project / 4 = Umbrella Project
 *
 * level が integer 0-4 以外なら violation。
 *
 * @param facts schema validation facts
 * @returns DetectorResult[] (= 1 violation per project with invalid level)
 */
export function detectSchemaValidationViolations(
  facts: SchemaValidationFacts,
): readonly DetectorResult[] {
  const results: DetectorResult[] = []

  for (const project of facts.projects) {
    if (project.level === null) {
      // null = level field 不在は別 rule (= PZ-1 = projectization metadata 欠落)、本 detector scope 外
      continue
    }

    const isValidLevel =
      Number.isInteger(project.level) && project.level >= 0 && project.level <= 4

    if (!isValidLevel) {
      results.push(
        createDetectorResult({
          ruleId: 'AR-SCHEMA-VALIDATION-PZ2',
          detectionType: 'governance-ops',
          // path-helpers.toRepoPath() で sourceFile を boundary validate
          // (= aag-engine-readiness-refactor Phase 6 adoption、Phase 4 で deferred 分)
          sourceFile: toRepoPath(project.configPath),
          severity: 'gate',
          actual: project.level,
          evidence: `level=${project.level} is not in [0, 1, 2, 3, 4]`,
          messageSeed: `project '${project.projectId}' の projectization.level (${project.level}) が AAG-COA Level 範囲 [0, 4] 外`,
        }),
      )
    }
  }

  return Object.freeze(results)
}
