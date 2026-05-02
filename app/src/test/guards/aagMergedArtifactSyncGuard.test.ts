/**
 * AAG Merged Artifact Sync Guard
 *
 * `docs/generated/aag/merged-architecture-rules.json` (派生 artifact、
 * `merge-artifact-generator.ts` で生成) が runtime `ARCHITECTURE_RULES`
 * (= `merged.ts` 出力) と byte-identical (resolvedBy field を除く) であることを
 * 機械保証する sync guard。
 *
 * **canonical merge policy**:
 *   `references/01-principles/aag/source-of-truth.md` §4 (Merge Policy)
 *   = 唯一の canonical。本 guard は §4.4「canonical 単一点としての義務」を
 *   realize し、artifact と runtime の drift (canonical → 派生 の一方向違反) を
 *   hard fail で防ぐ。
 *
 * 検証項目:
 * 1. artifact file が存在する
 * 2. artifact の rule 数が runtime ARCHITECTURE_RULES 数と一致
 * 3. artifact の rules (sans resolvedBy) が runtime ARCHITECTURE_RULES と
 *    structural identical (byte-identical via JSON serialization)
 * 4. artifact の resolvedBy 値が valid (project-overlay / defaults / stub / null)
 * 5. artifact の canonicalMergePolicy が canonical reference と一致
 *
 * drift 検出時の修復: `npm run generate:merged-artifact` (or `docs:generate`)。
 *
 * @responsibility R:guard
 * @see references/01-principles/aag/source-of-truth.md §4 (Merge Policy canonical)
 * @see app/src/test/architectureRules/merge-artifact-generator.ts
 *
 * @taxonomyKind T:meta-guard
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARCHITECTURE_RULES } from '../architectureRules'
import {
  CANONICAL_MERGE_POLICY,
  ARTIFACT_OUTPUT_PATH,
} from '../architectureRules/merge-artifact-generator'
import type { MergedArtifact } from '../architectureRules/merge-artifact-generator'

const ARTIFACT_PATH = resolve(__dirname, '../../../..', ARTIFACT_OUTPUT_PATH)

function loadArtifact(): MergedArtifact {
  return JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8')) as MergedArtifact
}

describe('AAG Merged Artifact Sync Guard', () => {
  it('artifact file exists', () => {
    expect(
      existsSync(ARTIFACT_PATH),
      `merged artifact missing at ${ARTIFACT_PATH}. ` +
        `Run \`npm run generate:merged-artifact\` (or \`npm run docs:generate\`).`,
    ).toBe(true)
  })

  it('artifact rule count matches runtime ARCHITECTURE_RULES', () => {
    const artifact = loadArtifact()
    expect(artifact.rules.length).toBe(ARCHITECTURE_RULES.length)
    expect(artifact.summary.totalRules).toBe(ARCHITECTURE_RULES.length)
  })

  it('artifact rules (sans resolvedBy) are structurally identical to runtime', () => {
    const artifact = loadArtifact()

    // Strip resolvedBy from artifact rules for comparison
    const artifactRulesNormalized = artifact.rules.map((r) => {
      // resolvedBy は artifact 専用 field、runtime には存在しないため除外
      const rest = { ...r } as Record<string, unknown>
      delete rest.resolvedBy
      return JSON.parse(JSON.stringify(rest))
    })

    // Runtime rules → JSON round-trip for equivalent shape (drops `undefined`,
    // converts readonly arrays to arrays, etc.)
    const runtimeRulesNormalized = JSON.parse(JSON.stringify(ARCHITECTURE_RULES))

    expect(artifactRulesNormalized).toEqual(runtimeRulesNormalized)
  })

  it('artifact resolvedBy values are valid', () => {
    const artifact = loadArtifact()
    const validForRequired = new Set(['project-overlay', 'defaults', 'stub'])
    const invalid: string[] = []
    for (const rule of artifact.rules) {
      const { resolvedBy } = rule
      if (!validForRequired.has(resolvedBy.fixNow)) {
        invalid.push(`${rule.id}.fixNow: invalid '${resolvedBy.fixNow}'`)
      }
      if (!validForRequired.has(resolvedBy.executionPlan)) {
        invalid.push(`${rule.id}.executionPlan: invalid '${resolvedBy.executionPlan}'`)
      }
      if (!validForRequired.has(resolvedBy.reviewPolicy)) {
        invalid.push(`${rule.id}.reviewPolicy: invalid '${resolvedBy.reviewPolicy}'`)
      }
      // lifecyclePolicy can be null (optional field, neither overlay nor defaults)
      if (
        resolvedBy.lifecyclePolicy !== null &&
        !validForRequired.has(resolvedBy.lifecyclePolicy)
      ) {
        invalid.push(`${rule.id}.lifecyclePolicy: invalid '${resolvedBy.lifecyclePolicy}'`)
      }
    }
    expect(invalid).toEqual([])
  })

  it('artifact canonicalMergePolicy matches canonical reference', () => {
    const artifact = loadArtifact()
    expect(artifact.canonicalMergePolicy).toBe(CANONICAL_MERGE_POLICY)
  })

  it('artifact summary counts match observed resolvedBy distribution', () => {
    const artifact = loadArtifact()
    const observed = {
      fixNow: { 'project-overlay': 0, defaults: 0, stub: 0 },
      executionPlan: { 'project-overlay': 0, defaults: 0, stub: 0 },
      reviewPolicy: { 'project-overlay': 0, defaults: 0, stub: 0 },
      lifecyclePolicy: { 'project-overlay': 0, defaults: 0, stub: 0, null: 0 },
    } as Record<string, Record<string, number>>

    for (const rule of artifact.rules) {
      observed.fixNow[rule.resolvedBy.fixNow]++
      observed.executionPlan[rule.resolvedBy.executionPlan]++
      observed.reviewPolicy[rule.resolvedBy.reviewPolicy]++
      const lifecycleKey = rule.resolvedBy.lifecyclePolicy ?? 'null'
      observed.lifecyclePolicy[lifecycleKey]++
    }

    expect(observed).toEqual(artifact.summary.resolvedBy)
  })
})
