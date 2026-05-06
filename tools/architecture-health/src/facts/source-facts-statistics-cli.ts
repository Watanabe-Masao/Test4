/**
 * Source Facts Statistics CLI — source-facts.json + aag-parameters.json から
 * aag-size-statistics.json を集計 + 書き出し。
 *
 * 使用例:
 *   npx tsx tools/architecture-health/src/facts/source-facts-statistics-cli.ts
 *
 * Generated artifact: references/04-tracking/generated/aag-size-statistics.json
 *
 * Wave 1 #5 (= reposteward-ai-ops-platform) で landing。Wave 1 #4 SourceFacts
 * collector が source-facts.json を articulate した後で本 CLI を実行する。
 *
 * @see tools/architecture-health/src/facts/source-facts-statistics.ts (= 集計 logic)
 * @see docs/contracts/aag/aag-size-statistics.schema.json (= canonical schema)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { computeSizeStatistics, type AAGParameters } from './source-facts-statistics'
import type { SourceFactsBundle } from './source-facts'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const SOURCE_FACTS_PATH = path.join(REPO_ROOT, 'references/04-tracking/generated/source-facts.json')
const PARAMETERS_PATH = path.join(REPO_ROOT, 'aag/parameters/aag-parameters.json')
const OUTPUT_PATH = path.join(REPO_ROOT, 'references/04-tracking/generated/aag-size-statistics.json')

function main(): void {
  if (!fs.existsSync(SOURCE_FACTS_PATH)) {
    console.error(`[size-statistics] missing source-facts: ${SOURCE_FACTS_PATH}`)
    console.error(`[size-statistics] hint: run 'npx tsx tools/architecture-health/src/facts/source-facts-cli.ts' first`)
    process.exit(2)
  }
  if (!fs.existsSync(PARAMETERS_PATH)) {
    console.error(`[size-statistics] missing aag-parameters: ${PARAMETERS_PATH}`)
    process.exit(2)
  }

  const bundle = JSON.parse(fs.readFileSync(SOURCE_FACTS_PATH, 'utf-8')) as SourceFactsBundle
  const parameters = JSON.parse(fs.readFileSync(PARAMETERS_PATH, 'utf-8')) as AAGParameters

  console.log(`[size-statistics] computing from ${bundle.facts.length} facts`)
  const start = Date.now()
  const stats = computeSizeStatistics(bundle, parameters)
  const elapsed = Date.now() - start

  const json = JSON.stringify(stats, null, 2) + '\n'
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8')

  console.log(`[size-statistics] wrote ${OUTPUT_PATH}`)
  console.log(`[size-statistics] totalFiles = ${stats.totalFiles}`)
  console.log(`[size-statistics] summary = p50=${stats.summary.p50} p90=${stats.summary.p90} p95=${stats.summary.p95} p99=${stats.summary.p99} max=${stats.summary.max} mean=${stats.summary.mean}`)
  console.log(`[size-statistics] bucket distribution:`)
  for (const b of stats.byBucket) {
    console.log(`[size-statistics]   ${b.id} (${b.label}): ${b.count}`)
  }
  console.log(`[size-statistics] layer count = ${Object.keys(stats.byLayer).length}`)
  console.log(`[size-statistics] elapsed = ${elapsed}ms`)
}

main()
