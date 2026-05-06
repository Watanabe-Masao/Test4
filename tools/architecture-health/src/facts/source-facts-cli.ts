/**
 * Source Facts CLI — collector を実行し JSON artifact を書き出す entry point。
 *
 * 使用例:
 *   npx tsx tools/architecture-health/src/facts/source-facts-cli.ts
 *
 * Generated artifact: references/04-tracking/generated/source-facts.json
 *
 * Wave 1 #4 (= reposteward-ai-ops-platform) では本 CLI を手動 / npm script 経由で
 * 実行する。Wave 1 #5 (= Effective LOC statistics) で docs:generate pipeline へ
 * 統合される (= source-facts.json も health collector が生成する artifact に格上げ予定)。
 *
 * @see tools/architecture-health/src/facts/source-facts.ts (= collector 本体)
 * @see docs/contracts/aag/source-facts.schema.json (= canonical schema)
 * @see aag/parameters/aag-parameters.json (= excludedKinds の入力 source)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { collectSourceFacts, type ExcludedKind } from './source-facts'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const PARAMETERS_PATH = path.join(REPO_ROOT, 'aag/parameters/aag-parameters.json')
const OUTPUT_PATH = path.join(REPO_ROOT, 'references/04-tracking/generated/source-facts.json')

function main(): void {
  const excludedKinds = readExcludedKinds()
  console.log(`[source-facts] collecting from ${REPO_ROOT}`)
  console.log(`[source-facts] excludedKinds = ${excludedKinds.join(', ') || '(none)'}`)

  const start = Date.now()
  const bundle = collectSourceFacts({ repoRoot: REPO_ROOT, excludedKinds })
  const elapsed = Date.now() - start

  const json = JSON.stringify(bundle, null, 2) + '\n'
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8')

  console.log(`[source-facts] wrote ${OUTPUT_PATH}`)
  console.log(`[source-facts] totalFiles = ${bundle.summary.totalFiles}`)
  for (const [kind, count] of Object.entries(bundle.summary.byKind)) {
    console.log(`[source-facts]   ${kind}: ${count}`)
  }
  console.log(`[source-facts] elapsed = ${elapsed}ms`)
}

function readExcludedKinds(): ExcludedKind[] {
  if (!fs.existsSync(PARAMETERS_PATH)) return []
  try {
    const raw = fs.readFileSync(PARAMETERS_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as {
      codeSize?: { excludedKinds?: ReadonlyArray<string> }
    }
    const list = parsed.codeSize?.excludedKinds ?? []
    return list.filter((k): k is ExcludedKind => k === 'generated' || k === 'fixture' || k === 'archive')
  } catch (e) {
    console.warn(`[source-facts] failed to read parameters: ${(e as Error).message}`)
    return []
  }
}

main()
