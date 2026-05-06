/**
 * Source Facts Statistics 契約テスト (Wave 1 #5 = reposteward-ai-ops-platform)
 *
 * computeSizeStatistics + computeSummary + computeBucketDistribution +
 * computeLayerStatistics の入力 → 出力 contract を機械検証する。
 *
 * 検証項目:
 *   - 空入力での 0 default articulation
 *   - percentile (linear interpolation + floor) の articulate
 *   - bucket distribution が parameters 順序と count を articulate
 *   - layer 集約 (= layer null の file は除外、残りは layer key で aggregate)
 *   - schema field 型整合 (= integer / float の articulation)
 *
 * @responsibility R:unclassified
 * @see tools/architecture-health/src/facts/source-facts-statistics.ts
 * @see docs/contracts/aag/aag-size-statistics.schema.json
 *
 * @taxonomyKind T:unclassified
 */
import { describe, expect, it } from 'vitest'
import {
  computeSummary,
  computeBucketDistribution,
  computeLayerStatistics,
  computeSizeStatistics,
  type ParameterBucket,
  type AAGParameters,
} from '@tools/architecture-health/facts/source-facts-statistics'
import type { SourceFact, SourceFactsBundle } from '@tools/architecture-health/facts/source-facts'

const MINI_BUCKETS: ReadonlyArray<ParameterBucket> = [
  { id: 'loc.001_010', label: '1-10', min: 1, max: 10 },
  { id: 'loc.011_020', label: '11-20', min: 11, max: 20 },
  { id: 'loc.021_030', label: '21-30', min: 21, max: 30 },
  { id: 'loc.031_plus', label: '31+', min: 31, max: null },
]

const MINI_PARAMETERS: AAGParameters = {
  codeSize: { metric: 'effectiveCodeLines', buckets: MINI_BUCKETS, excludedKinds: [] },
}

function makeFact(overrides: Partial<SourceFact>): SourceFact {
  return {
    path: overrides.path ?? 'app/src/x.ts',
    kind: overrides.kind ?? 'typescript',
    layer: overrides.layer ?? null,
    physicalLines: overrides.physicalLines ?? 10,
    blankLines: overrides.blankLines ?? 0,
    commentLines: overrides.commentLines ?? 0,
    effectiveCodeLines: overrides.effectiveCodeLines ?? 10,
    ...(overrides.imports ? { imports: overrides.imports } : {}),
    ...(overrides.exports != null ? { exports: overrides.exports } : {}),
    ...(overrides.hooks ? { hooks: overrides.hooks } : {}),
  }
}

describe('Source Facts Statistics 契約テスト', () => {
  it('空入力では全 0 を articulate', () => {
    const summary = computeSummary([])
    expect(summary).toEqual({ p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 })
  })

  it('単一値 input では全 percentile が同値、mean = 値', () => {
    const summary = computeSummary([42])
    expect(summary.p50).toBe(42)
    expect(summary.p99).toBe(42)
    expect(summary.max).toBe(42)
    expect(summary.mean).toBe(42)
  })

  it('percentile は floor を articulate (= 行数 = 整数 semantic)', () => {
    // [10, 20, 30, 40, 50] → p50 (median) = 30、p90 ≈ 46 → floor = 46
    const summary = computeSummary([10, 20, 30, 40, 50])
    expect(summary.p50).toBe(30)
    expect(summary.p90).toBe(46)
    expect(summary.max).toBe(50)
    expect(summary.mean).toBe(30)
  })

  it('bucket distribution: 各 fact が範囲 inclusive で 1 bucket に articulate', () => {
    const facts: SourceFact[] = [
      makeFact({ effectiveCodeLines: 5 }), // loc.001_010
      makeFact({ effectiveCodeLines: 10 }), // loc.001_010 (boundary inclusive)
      makeFact({ effectiveCodeLines: 11 }), // loc.011_020
      makeFact({ effectiveCodeLines: 25 }), // loc.021_030
      makeFact({ effectiveCodeLines: 100 }), // loc.031_plus
    ]
    const dist = computeBucketDistribution(facts, MINI_BUCKETS)
    expect(dist).toHaveLength(4)
    expect(dist.find((d) => d.id === 'loc.001_010')?.count).toBe(2)
    expect(dist.find((d) => d.id === 'loc.011_020')?.count).toBe(1)
    expect(dist.find((d) => d.id === 'loc.021_030')?.count).toBe(1)
    expect(dist.find((d) => d.id === 'loc.031_plus')?.count).toBe(1)
  })

  it('bucket distribution: parameters 順序を保持', () => {
    const dist = computeBucketDistribution([], MINI_BUCKETS)
    const ids = dist.map((d) => d.id)
    expect(ids).toEqual(['loc.001_010', 'loc.011_020', 'loc.021_030', 'loc.031_plus'])
  })

  it('layer statistics: layer 別 group + 集計', () => {
    const facts: SourceFact[] = [
      makeFact({ layer: 'presentation', effectiveCodeLines: 10 }),
      makeFact({ layer: 'presentation', effectiveCodeLines: 50 }),
      makeFact({ layer: 'presentation', effectiveCodeLines: 100 }),
      makeFact({ layer: 'domain', effectiveCodeLines: 30 }),
      makeFact({ layer: null, effectiveCodeLines: 999 }), // null は除外
    ]
    const layers = computeLayerStatistics(facts)
    expect(Object.keys(layers).sort()).toEqual(['domain', 'presentation'])
    expect(layers.presentation.fileCount).toBe(3)
    expect(layers.presentation.max).toBe(100)
    expect(layers.domain.fileCount).toBe(1)
    expect(layers.domain.max).toBe(30)
  })

  it('layer statistics: layer null は集約対象外', () => {
    const layers = computeLayerStatistics([
      makeFact({ layer: null, effectiveCodeLines: 100 }),
    ])
    expect(Object.keys(layers)).toHaveLength(0)
  })

  it('computeSizeStatistics: bundle / parameters → schema 互換 output', () => {
    const bundle: SourceFactsBundle = {
      schemaVersion: 'source-facts-v1',
      generatedAt: new Date().toISOString(),
      summary: { totalFiles: 3, byKind: {}, excludedKinds: [] },
      facts: [
        makeFact({ layer: 'presentation', effectiveCodeLines: 5 }),
        makeFact({ layer: 'presentation', effectiveCodeLines: 25 }),
        makeFact({ layer: 'domain', effectiveCodeLines: 100 }),
      ],
    }
    const stats = computeSizeStatistics(bundle, MINI_PARAMETERS)
    expect(stats.schemaVersion).toBe('aag-size-statistics-v1')
    expect(stats.metric).toBe('effectiveCodeLines')
    expect(stats.totalFiles).toBe(3)
    expect(stats.byBucket).toHaveLength(4)
    expect(stats.byBucket.find((b) => b.id === 'loc.001_010')?.count).toBe(1)
    expect(stats.byBucket.find((b) => b.id === 'loc.021_030')?.count).toBe(1)
    expect(stats.byBucket.find((b) => b.id === 'loc.031_plus')?.count).toBe(1)
    expect(Object.keys(stats.byLayer).sort()).toEqual(['domain', 'presentation'])
  })

  it('mean は float (= 半端可)、percentile は integer', () => {
    const summary = computeSummary([1, 2, 3])
    // mean = 2.0 → float
    expect(summary.mean).toBe(2)
    // percentile は integer
    expect(Number.isInteger(summary.p50)).toBe(true)
    expect(Number.isInteger(summary.p90)).toBe(true)
    expect(Number.isInteger(summary.max)).toBe(true)

    const summary2 = computeSummary([1, 2])
    // mean = 1.5 → 半端 OK
    expect(summary2.mean).toBe(1.5)
  })

  it('byBucket は overlap 範囲でも各 fact が 1 bucket のみ count される', () => {
    // boundary inclusivity: 10 は loc.001_010 (max=10) に入る
    const dist = computeBucketDistribution(
      [makeFact({ effectiveCodeLines: 10 }), makeFact({ effectiveCodeLines: 11 })],
      MINI_BUCKETS,
    )
    expect(dist.find((d) => d.id === 'loc.001_010')?.count).toBe(1)
    expect(dist.find((d) => d.id === 'loc.011_020')?.count).toBe(1)
  })
})
