/**
 * Project Lifecycle Detector — `aag-engine-readiness-refactor` Phase 2 demonstration
 *
 * **役割**: 5 系統 (= contracts / generated / project lifecycle / rule source / guard source)
 * のうち **project lifecycle 系** に対する pure detector の demonstration 実装。
 *
 * **位置付け**:
 *   - 既存 `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` の
 *     `checkConsistency()` (= violation 集合を articulate) と **同じ violation 経路**
 *     を `DetectorResult[]` で emit する parallel implementation。
 *   - 既存 guard の検出条件は **変えない** (= 不可侵原則 2)。本 detector は
 *     後方互換 = 既存 violation 集合と 1:1 対応する DetectorResult を emit する。
 *   - 本 detector は **collector facts を input に取る pure function** (= fs / glob
 *     依存を持たず、与えられた facts を pure に判定する)。これは Phase 3
 *     (Collector / Detector / Renderer 分離) で全 5 系統に展開予定の articulation
 *     の前駆例となる。
 *
 * **demonstration scope** (= 1 系統 demonstration、Phase 2 完了条件):
 *   - C1 (= completed but not archived) の判定経路を pure detector 化
 *   - 残り 6 violation code (C2 / C3 / C4 / L1 / L2 / L3) は Phase 3 (= 5 系統 systematic
 *     adoption) で展開
 *   - 本 demonstration は適用 pattern を articulate するための minimal instance
 *
 * **不可侵原則**:
 *   - 本 detector は production の `projectCompletionConsistencyGuard.test.ts` を
 *     **置換しない**。既存 guard は existing AagResponse 経路で動作継続。
 *   - C1 ruleId / sourceFile / severity は既存 guard violation 集合と **1:1 整合**
 *     させる (= machine-readable output が既存 human-readable output と意味的に等価)。
 *
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult TS contract)
 * @see app/src/test/guards/projectCompletionConsistencyGuard.test.ts (= 既存 production guard)
 * @see references/03-implementation/aag-engine-readiness-inventory.md §6.1 (= 5 系統 articulate)
 */

import { createDetectorResult, type DetectorResult } from '../detector-result.js'
import { toRepoPath } from '../path-helpers.js'
import type { ProjectChecklistResult } from '../collectors/project-checklist-collector.js'

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

/**
 * project lifecycle 違反の input facts。
 *
 * 既存 collector (= `collectProjectChecklists`) の output `ProjectChecklistResult[]`
 * を direct に input に取る。本 detector は fs / glob 依存を持たない (= pure)。
 */
export interface ProjectLifecycleFacts {
  /** 全 project (active + completed) の checklist 状態。 */
  readonly checklistResults: readonly ProjectChecklistResult[]
}

/**
 * project lifecycle 違反を検出し `DetectorResult[]` を emit する pure function。
 *
 * 検出 rule (= demonstration scope = C1 のみ):
 *   - **C1** (= completed but not archived): checklist 100% 完了だが
 *     `derivedStatus !== 'archived'` の project を `gate` severity で emit
 *
 * Phase 3 で追加展開予定 (= demonstration scope 外):
 *   - C2 / C3 (= CURRENT_PROJECT.md 妥当性)
 *   - C4 / L1 / L2 / L3 (= cross-reference integrity)
 *
 * @param facts project lifecycle facts (= collector output)
 * @returns DetectorResult[] (= 違反集合、空 array は違反なし)
 */
export function detectProjectLifecycleViolations(
  facts: ProjectLifecycleFacts,
): readonly DetectorResult[] {
  const results: DetectorResult[] = []

  for (const project of facts.checklistResults) {
    // C1: completed checklist だが archive 未実施
    if (
      project.derivedStatus === 'completed' &&
      project.meta.kind !== 'collection' // collection は完了概念を持たない
    ) {
      results.push(
        createDetectorResult({
          ruleId: 'AR-PROJECT-LIFECYCLE-C1',
          detectionType: 'governance-ops',
          // path-helpers.toRepoPath() で sourceFile を boundary validate
          // (= aag-engine-readiness-refactor Phase 4 adoption、不正 path で hard fail)
          sourceFile: toRepoPath(project.meta.projectRoot),
          severity: 'gate',
          actual: project.checked,
          baseline: project.total,
          messageSeed: `project '${project.meta.projectId}' は checklist 100% 完了 (${project.checked}/${project.total}) ですが projects/completed/ に移されていません`,
        }),
      )
    }
  }

  return Object.freeze(results)
}
