/**
 * docs:check — health gate 判定 + 構造整合性チェック
 *
 * CI で実行する。以下を検証する:
 *   1. health gate（hard gate 通過）
 *   2. generated section マーカーの存在と対の整合性
 *   3. architecture-health.json の schemaVersion と KPI 件数の妥当性
 *
 * バイト単位の diff 比較は行わない。
 * タイムスタンプやバンドルサイズは環境依存で変動するため、
 * 「構造が正しいか」「gate を通過するか」だけを CI で検証する。
 *
 * 開発者の責務: `npm run docs:generate` を実行し、結果をコミットする。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectFromSnapshot } from './collectors/snapshot-collector.js'
import { collectFromGuards } from './collectors/guard-collector.js'
import { collectFromDocs } from './collectors/doc-collector.js'
import { collectFromBundle } from './collectors/bundle-collector.js'
import { evaluate } from './evaluator.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

const errors: string[] = []

// ---------------------------------------------------------------------------
// 1. Health gate 判定
// ---------------------------------------------------------------------------
console.log('[docs:check] Collecting health KPIs...')

const snapshotKpis = collectFromSnapshot(repoRoot)
const guardKpis = collectFromGuards(repoRoot)
const docKpis = collectFromDocs(repoRoot)
const bundleKpis = collectFromBundle(repoRoot)

const allKpis = [...snapshotKpis, ...guardKpis, ...docKpis, ...bundleKpis]
console.log(`[docs:check] ${allKpis.length} KPIs collected`)

const report = evaluate(allKpis)

if (!report.summary.hardGatePass) {
  console.error('[docs:check] Hard gate FAILED')
  for (const kpi of report.kpis) {
    if (kpi.status === 'fail') {
      errors.push(`Hard gate fail: ${kpi.id} = ${kpi.value} (budget: ${kpi.budget})`)
    }
  }
}

console.log(`[docs:check] Hard gate: ${report.summary.hardGatePass ? 'PASS' : 'FAIL'}`)

// ---------------------------------------------------------------------------
// 2. Generated section マーカーの整合性
// ---------------------------------------------------------------------------
console.log('[docs:check] Checking generated section markers...')

const SECTION_FILES = [
  { path: 'CLAUDE.md', sectionId: 'architecture-health-summary' },
  { path: 'references/02-status/technical-debt-roadmap.md', sectionId: 'architecture-health-summary' },
] as const

for (const { path, sectionId } of SECTION_FILES) {
  const absPath = resolve(repoRoot, path)
  if (!existsSync(absPath)) {
    errors.push(`Missing file: ${path}`)
    continue
  }
  const content = readFileSync(absPath, 'utf-8')
  const startTag = `<!-- GENERATED:START ${sectionId} -->`
  const endTag = `<!-- GENERATED:END ${sectionId} -->`

  if (!content.includes(startTag)) {
    errors.push(`Missing start marker in ${path}: ${startTag}`)
  }
  if (!content.includes(endTag)) {
    errors.push(`Missing end marker in ${path}: ${endTag}`)
  }

  // マーカー間にコンテンツがあるか
  const startIdx = content.indexOf(startTag)
  const endIdx = content.indexOf(endTag)
  if (startIdx >= 0 && endIdx >= 0) {
    const between = content.slice(startIdx + startTag.length, endIdx).trim()
    if (between.length === 0) {
      errors.push(`Empty generated section in ${path}: ${sectionId}`)
    }
  }
}

// ---------------------------------------------------------------------------
// 3. architecture-health.json の存在と妥当性
// ---------------------------------------------------------------------------
console.log('[docs:check] Checking architecture-health.json...')

const healthJsonPath = resolve(
  repoRoot,
  'references/02-status/generated/architecture-health.json',
)

if (!existsSync(healthJsonPath)) {
  errors.push('Missing: references/02-status/generated/architecture-health.json')
} else {
  try {
    const healthJson = JSON.parse(readFileSync(healthJsonPath, 'utf-8'))
    if (healthJson.schemaVersion !== '1.0.0') {
      errors.push(`Unexpected schemaVersion: ${healthJson.schemaVersion}`)
    }
    if (!healthJson.kpis || healthJson.kpis.length === 0) {
      errors.push('architecture-health.json has no KPIs')
    }
    if (!healthJson.summary) {
      errors.push('architecture-health.json has no summary')
    }
  } catch (e) {
    errors.push(`Invalid JSON in architecture-health.json: ${e}`)
  }
}

// ---------------------------------------------------------------------------
// 4. certificate の存在
// ---------------------------------------------------------------------------
const certPath = resolve(
  repoRoot,
  'references/02-status/generated/architecture-health-certificate.md',
)
if (!existsSync(certPath)) {
  errors.push('Missing: references/02-status/generated/architecture-health-certificate.md')
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
if (errors.length > 0) {
  console.error('')
  console.error(`[docs:check] FAIL — ${errors.length} error(s):`)
  for (const err of errors) {
    console.error(`  ✗ ${err}`)
  }
  console.error('')
  console.error('Fix: run `npm run docs:generate` and commit the changes.')
  process.exit(1)
}

console.log('')
console.log('[docs:check] PASS — health gate passed, all generated docs are structurally valid.')
