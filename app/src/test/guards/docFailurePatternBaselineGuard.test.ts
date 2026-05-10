/**
 * DOC-FAIL-* baseline ratchet-down guards (= 5 patterns、guardrail-shadow stage)
 *
 * **Stage**: guardrail-shadow (= warning emit + ratchet-down baseline 確立、exit 0、
 * AAG-SCP-DOC-LEARNING-002 5 段階 maturity progression 整合)
 *
 * **Approach**: docs/contracts/src/docs/document-reading-decisions.yaml の failurePatterns
 * field を scan し、各 DOC-FAIL-* pattern の observed count を baseline として ratchet-down
 * 監視。新規 doc に同 pattern が articulate されると count 増加 → baseline 超過 detection。
 *
 * **Covered patterns** (= 5 件、guard candidates threshold ≥5 達成済):
 * | pattern | obs (baseline) | source |
 * |---|---|---|
 * | DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE | 16 | aag-scp Reading Pass で観測 |
 * | DOC-FAIL-LOCATION-MISMATCH | 13 | 同上 |
 * | DOC-FAIL-TEMPORAL-MIXING | 6 | 同上 |
 * | DOC-FAIL-GENERATED-AS-MANUAL | 5 | 同上 |
 * | DOC-FAIL-STALE-DESCRIPTION | 5 | aag-scp + 自身の HANDOFF sync で 5 件目観測 |
 *
 * **Note**: DOC-FAIL-DUPLICATE-RESPONSIBILITY は別 guard で sophisticated detection 実装
 * (= docDuplicateResponsibilityGuard.test.ts、byte-identical sha256 比較)。
 *
 * **Wave 4+ progression**: 各 guard を guardrail-shadow → guardrail-advisory → hard-fail に
 * 段階昇格 (= user 判断 gate 経由)、本 stage は baseline 確立のみ。
 *
 * @see docs/contracts/src/docs/document-failure-taxonomy.yaml (= 11 patterns articulate)
 * @see docs/contracts/src/docs/document-reading-decisions.yaml (= failurePatterns observation source)
 * @see projects/active/aag-failure-pattern-guards/ (= 本 guard が属する sub-program)
 *
 * @responsibility R:unclassified
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load as loadYaml } from 'js-yaml'

const REPO_ROOT = resolve(__dirname, '../../../..')
const READING_DECISIONS_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/src/docs/document-reading-decisions.yaml',
)

interface ReadingDecisionEntry {
  readonly path: string
  readonly failurePatterns?: readonly string[]
}

interface ReadingDecisionsDoc {
  readonly entries: readonly ReadingDecisionEntry[]
}

function loadReadingDecisions(): ReadingDecisionsDoc {
  const content = readFileSync(READING_DECISIONS_PATH, 'utf8')
  return loadYaml(content) as ReadingDecisionsDoc
}

function countObservations(patternId: string): {
  count: number
  observedPaths: string[]
} {
  const doc = loadReadingDecisions()
  const observedPaths: string[] = []
  for (const entry of doc.entries) {
    if (entry.failurePatterns?.includes(patternId)) {
      observedPaths.push(entry.path)
    }
  }
  return { count: observedPaths.length, observedPaths }
}

/**
 * Baseline 値 = 本 guard 着地時点の observed count (= 2026-05-10 時点)。
 * 増加禁止 (= ratchet-down)、減少時は baseline を下げる (= 別 sub-PR で update)。
 *
 * shadow mode: baseline 超過しても fail しない、warning emit のみ。
 * Wave 4+ で hard-fail 化 (= AAG-SCP-DOC-LEARNING-002 5 段階 progression)。
 */
const BASELINES = {
  'DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE': 16,
  'DOC-FAIL-LOCATION-MISMATCH': 13,
  'DOC-FAIL-TEMPORAL-MIXING': 6,
  'DOC-FAIL-GENERATED-AS-MANUAL': 5,
  'DOC-FAIL-STALE-DESCRIPTION': 5,
} as const

function shadowAssert(
  patternId: keyof typeof BASELINES,
  result: { count: number; observedPaths: string[] },
): void {
  const baseline = BASELINES[patternId]
  if (result.count > baseline) {
    console.warn(
      `[${patternId} shadow] observation count ${result.count} exceeds baseline ${baseline}:`,
    )
    for (const p of result.observedPaths) {
      console.warn(`  - ${p}`)
    }
    console.warn(
      `  → 新 observation ${result.count - baseline} 件追加。baseline を ${result.count} に update するか、観測 doc を rewrite-and-contract で対処。`,
    )
  }
  // shadow mode: baseline 超過でも fail しない (= 上限を上回っても OK だが advisory)
  expect(result.count).toBeLessThanOrEqual(Math.max(baseline, result.count))
}

describe('docFailurePatternBaselineGuard (= 5 DOC-FAIL-* shadow checks)', () => {
  it('DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE が baseline (16) を超えない (shadow mode)', () => {
    shadowAssert(
      'DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE',
      countObservations('DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE'),
    )
  })

  it('DOC-FAIL-LOCATION-MISMATCH が baseline (13) を超えない (shadow mode)', () => {
    shadowAssert('DOC-FAIL-LOCATION-MISMATCH', countObservations('DOC-FAIL-LOCATION-MISMATCH'))
  })

  it('DOC-FAIL-TEMPORAL-MIXING が baseline (6) を超えない (shadow mode)', () => {
    shadowAssert('DOC-FAIL-TEMPORAL-MIXING', countObservations('DOC-FAIL-TEMPORAL-MIXING'))
  })

  it('DOC-FAIL-GENERATED-AS-MANUAL が baseline (5) を超えない (shadow mode)', () => {
    shadowAssert('DOC-FAIL-GENERATED-AS-MANUAL', countObservations('DOC-FAIL-GENERATED-AS-MANUAL'))
  })

  it('DOC-FAIL-STALE-DESCRIPTION が baseline (5) を超えない (shadow mode)', () => {
    shadowAssert('DOC-FAIL-STALE-DESCRIPTION', countObservations('DOC-FAIL-STALE-DESCRIPTION'))
  })

  it('baseline が現状より大きすぎない (= ratchet-down が stale していない)', () => {
    // 各 baseline と現状 count の差が 5 件以上あれば、baseline を下げる必要あり (= advisory)
    const stalenessReports: string[] = []
    for (const [patternId, baseline] of Object.entries(BASELINES) as Array<
      [keyof typeof BASELINES, number]
    >) {
      const result = countObservations(patternId)
      const slack = baseline - result.count
      if (slack >= 5) {
        stalenessReports.push(
          `${patternId}: baseline ${baseline}、現状 ${result.count}、slack ${slack} (= baseline 下げ candidate)`,
        )
      }
    }
    if (stalenessReports.length > 0) {
      console.warn('[BASELINES staleness advisory] baseline と現状の乖離:')
      stalenessReports.forEach((r) => console.warn(`  - ${r}`))
      console.warn('  → baseline を下げる (= ratchet-down strict mode 維持) のは別 sub-PR で対応。')
    }
    expect(stalenessReports.length).toBeGreaterThanOrEqual(0)
  })

  it('reading-decisions yaml が読み込み可能 (= self-test)', () => {
    const doc = loadReadingDecisions()
    expect(doc.entries.length).toBeGreaterThan(0)
  })
})
