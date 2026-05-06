/**
 * Source Facts Statistics MD Renderer — aag-size-statistics.json を
 * human-readable markdown で articulate する renderer。
 *
 * Wave 2 #9 (= reposteward-ai-ops-platform、Health report に bucket distribution
 * 追加) で landing。canonical input = `references/04-tracking/generated/aag-size-statistics.json`、
 * canonical output = `references/04-tracking/generated/aag-size-statistics.generated.md`。
 *
 * 設計判断:
 *   - architecture-health.generated.md (= 既存 health report) は touch せず、
 *     独立 generated artifact として articulate (= blast radius 最小、Wave 2 #7/#8
 *     と同 scope 分離 idiom)
 *   - md は AI consumer + human reader 両方が読む surface (= Health summary
 *     table、bucket distribution table、layer-level table の 3 section articulate)
 *
 * 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
 *   1. JSON-first → MD は secondary articulation (= JSON 正本、MD は view)
 *   2. AI-first → MD は AI session も読みやすい簡素 table 構造
 *   3. Read-only first → renderer は input JSON を read-only に消費、output MD を書く以外副作用なし
 *
 * @see tools/architecture-health/src/facts/source-facts-statistics.ts (= statistics 集計 logic)
 * @see docs/contracts/aag/aag-size-statistics.schema.json (= input contract)
 */

import type { SizeStatisticsBundle, LayerStatistics } from './source-facts-statistics'

/**
 * SizeStatisticsBundle を markdown 文字列に articulate。
 *
 * Output 構造:
 *   1. header (= 生成 timestamp + metric)
 *   2. Summary section (= totalFiles + percentile + max + mean)
 *   3. Bucket Distribution section (= bucket id + label + count + 累積 / 比率)
 *   4. By Layer section (= layer × fileCount + p50 + p90 + p95 + max)
 */
export function renderStatisticsMarkdown(bundle: SizeStatisticsBundle): string {
  const lines: string[] = []
  lines.push('# AAG Size Statistics')
  lines.push('')
  lines.push('> **役割: 生成された effective LOC 集計の articulation (= 機械生成、手編集禁止)。**')
  lines.push(
    '> 正本: [`aag-size-statistics.json`](./aag-size-statistics.json)、集計対象: [`source-facts.json`](./source-facts.json)、bucket 定義: [`aag/parameters/aag-parameters.json`](../../../aag/parameters/aag-parameters.json)。',
  )
  lines.push('')
  lines.push(`> 生成: ${bundle.generatedAt}`)
  lines.push(`> 集計 metric: \`${bundle.metric}\``)
  lines.push(`> 集計対象 file 数: **${bundle.totalFiles}**`)
  lines.push('')

  lines.push('## Summary (= 全 file 集計)')
  lines.push('')
  lines.push('| 指標 | 値 |')
  lines.push('|---|---|')
  lines.push(`| p50 (median) | ${bundle.summary.p50} |`)
  lines.push(`| p75 | ${bundle.summary.p75} |`)
  lines.push(`| p90 | ${bundle.summary.p90} |`)
  lines.push(`| p95 | ${bundle.summary.p95} |`)
  lines.push(`| p99 | ${bundle.summary.p99} |`)
  lines.push(`| max | ${bundle.summary.max} |`)
  lines.push(`| mean | ${bundle.summary.mean} |`)
  lines.push('')

  lines.push('## Bucket Distribution (= effective LOC 範囲別 file 数)')
  lines.push('')
  lines.push('| bucket id | label | file 数 | 比率 | 累積 |')
  lines.push('|---|---|---:|---:|---:|')
  let cumul = 0
  const total = bundle.totalFiles || 1
  for (const b of bundle.byBucket) {
    cumul += b.count
    const ratio = ((b.count / total) * 100).toFixed(1)
    const cumulRatio = ((cumul / total) * 100).toFixed(1)
    lines.push(`| \`${b.id}\` | ${b.label} | ${b.count} | ${ratio}% | ${cumulRatio}% |`)
  }
  lines.push('')

  lines.push('## By Layer (= layer 別 effective LOC 集計)')
  lines.push('')
  lines.push('| layer | file 数 | p50 | p90 | p95 | max |')
  lines.push('|---|---:|---:|---:|---:|---:|')
  const layerKeys = Object.keys(bundle.byLayer).sort()
  for (const key of layerKeys) {
    const l: LayerStatistics = bundle.byLayer[key]
    lines.push(`| \`${key}\` | ${l.fileCount} | ${l.p50} | ${l.p90} | ${l.p95} | ${l.max} |`)
  }
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push(
    '> 関連 query: `aag stats files --metric effectiveCodeLines --range N..M` / `--bucket loc.021_030` / `--layer presentation` / `--above p95` (= Wave 1 #6 deliverable)。',
  )
  lines.push('')

  return lines.join('\n')
}
