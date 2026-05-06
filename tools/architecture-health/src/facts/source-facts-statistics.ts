/**
 * Source Facts Statistics — SourceFacts (Wave 1 #4) を入力に effective LOC の
 * distribution / percentile / per-layer breakdown を articulate する集計 layer。
 *
 * Wave 1 #5 (= reposteward-ai-ops-platform) で landing。canonical schema =
 * `docs/contracts/aag/aag-size-statistics.schema.json`。Wave 1 #6 stats files
 * query が本 statistics の bucket id 経由で file-level 詳細に到達、Wave 2
 * sizeGuard refactor が本 statistics で baseline / ratchet-down の base を articulate。
 *
 * 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
 *   1. JSON-first (= output は schema 準拠 JSON)
 *   3. Read-only first (= source-facts.json + aag-parameters.json を read-only に消費)
 *   6. Additive-only (= 既存 architecture-health pipeline に並行で追加、本 PR では Health KPI に統合しない)
 *
 * @see docs/contracts/aag/aag-size-statistics.schema.json (canonical)
 * @see tools/architecture-health/src/facts/source-facts.ts (= 入力 source)
 * @see aag/parameters/aag-parameters.json (= bucket 定義)
 */

import type { SourceFact, SourceFactsBundle } from './source-facts'

// ───────────────────────────────────────────────────────────────────────
// types
// ───────────────────────────────────────────────────────────────────────

export interface ParameterBucket {
  readonly id: string
  readonly label: string
  readonly min: number
  readonly max: number | null
}

export interface AAGParameters {
  readonly codeSize: {
    readonly metric: 'effectiveCodeLines'
    readonly buckets: ReadonlyArray<ParameterBucket>
    readonly excludedKinds?: ReadonlyArray<string>
  }
}

export interface SizeStatisticsSummary {
  readonly p50: number
  readonly p75: number
  readonly p90: number
  readonly p95: number
  readonly p99: number
  readonly max: number
  readonly mean: number
}

export interface BucketDistribution {
  readonly id: string
  readonly label: string
  readonly count: number
}

export interface LayerStatistics {
  readonly fileCount: number
  readonly p50: number
  readonly p90: number
  readonly p95: number
  readonly max: number
}

export interface SizeStatisticsBundle {
  readonly schemaVersion: 'aag-size-statistics-v1'
  readonly generatedAt: string
  readonly metric: 'effectiveCodeLines'
  readonly totalFiles: number
  readonly summary: SizeStatisticsSummary
  readonly byBucket: ReadonlyArray<BucketDistribution>
  readonly byLayer: Readonly<Record<string, LayerStatistics>>
}

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

export function computeSizeStatistics(
  bundle: SourceFactsBundle,
  parameters: AAGParameters,
): SizeStatisticsBundle {
  const facts = bundle.facts
  const values = facts.map((f) => f.effectiveCodeLines)

  return {
    schemaVersion: 'aag-size-statistics-v1',
    generatedAt: new Date().toISOString(),
    metric: 'effectiveCodeLines',
    totalFiles: facts.length,
    summary: computeSummary(values),
    byBucket: computeBucketDistribution(facts, parameters.codeSize.buckets),
    byLayer: computeLayerStatistics(facts),
  }
}

// ───────────────────────────────────────────────────────────────────────
// internals
// ───────────────────────────────────────────────────────────────────────

export function computeSummary(values: ReadonlyArray<number>): SizeStatisticsSummary {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 }
  }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  return {
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
    mean: round2(sum / sorted.length),
  }
}

/**
 * percentile (= linear interpolation) を articulate。
 * `sortedValues` は ascending order を前提 (= caller 側で sort 済)。
 * 結果は floor で integer に articulate (= 行数 = 整数 semantic 整合)。
 */
function percentile(sortedValues: ReadonlyArray<number>, q: number): number {
  if (sortedValues.length === 0) return 0
  if (sortedValues.length === 1) return sortedValues[0]
  const idx = q * (sortedValues.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sortedValues[lower]
  const interp = sortedValues[lower] * (upper - idx) + sortedValues[upper] * (idx - lower)
  return Math.floor(interp)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

export function computeBucketDistribution(
  facts: ReadonlyArray<SourceFact>,
  buckets: ReadonlyArray<ParameterBucket>,
): ReadonlyArray<BucketDistribution> {
  const counts = new Map<string, number>()
  for (const b of buckets) counts.set(b.id, 0)
  for (const f of facts) {
    const v = f.effectiveCodeLines
    for (const b of buckets) {
      const upper = b.max == null ? Infinity : b.max
      if (v >= b.min && v <= upper) {
        counts.set(b.id, (counts.get(b.id) ?? 0) + 1)
        break
      }
    }
  }
  return buckets.map((b) => ({
    id: b.id,
    label: b.label,
    count: counts.get(b.id) ?? 0,
  }))
}

export function computeLayerStatistics(
  facts: ReadonlyArray<SourceFact>,
): Readonly<Record<string, LayerStatistics>> {
  const grouped = new Map<string, number[]>()
  for (const f of facts) {
    if (f.layer == null) continue
    const arr = grouped.get(f.layer) ?? []
    arr.push(f.effectiveCodeLines)
    grouped.set(f.layer, arr)
  }
  const out: Record<string, LayerStatistics> = {}
  for (const [layer, values] of grouped.entries()) {
    const sorted = values.slice().sort((a, b) => a - b)
    out[layer] = {
      fileCount: sorted.length,
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
      p95: percentile(sorted, 0.95),
      max: sorted[sorted.length - 1] ?? 0,
    }
  }
  return out
}
