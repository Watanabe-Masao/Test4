/**
 * Architecture Health — メインエントリポイント
 *
 * モード:
 *   npx tsx tools/architecture-health/src/main.ts              # generate (デフォルト)
 *   npx tsx tools/architecture-health/src/main.ts --check      # 差分検出のみ（書き込みしない）
 *   npx tsx tools/architecture-health/src/main.ts --pr-comment # PR コメント用 Markdown を stdout に出力
 *
 * npm scripts:
 *   npm run health           # generate mode
 *   npm run health:check     # check mode
 *   npm run docs:generate    # generate mode (alias)
 *   npm run docs:check       # generate → git diff --exit-code
 */
import { resolve, dirname } from 'node:path'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { collectFromSnapshot } from './collectors/snapshot-collector.js'
import { collectFromGuards } from './collectors/guard-collector.js'
import { collectFromDocs } from './collectors/doc-collector.js'
import { collectFromBundle } from './collectors/bundle-collector.js'
import { collectObligations, reportObligationDetails } from './collectors/obligation-collector.js'
import { evaluate } from './evaluator.js'
import { renderJson } from './renderers/json-renderer.js'
import { renderMd, renderInlineSection } from './renderers/md-renderer.js'
import { updateGeneratedSections } from './renderers/section-updater.js'
import { renderPrComment } from './renderers/pr-comment-renderer.js'
import type { HealthReport } from './types.js'

const args = new Set(process.argv.slice(2))
const isCheck = args.has('--check')
const isPrComment = args.has('--pr-comment')
const base = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1]

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const healthJsonPath = resolve(
  repoRoot,
  'references/02-status/generated/architecture-health.json',
)

// ---------------------------------------------------------------------------
// 0. 前回の report を読む（trend 比較用）
// ---------------------------------------------------------------------------
let previousReport: HealthReport | undefined
if (existsSync(healthJsonPath)) {
  try {
    previousReport = JSON.parse(readFileSync(healthJsonPath, 'utf-8'))
  } catch {
    // 破損していても続行
  }
}

// ---------------------------------------------------------------------------
// 1. 収集
// ---------------------------------------------------------------------------
console.error('[collect] snapshot...')
const snapshotKpis = collectFromSnapshot(repoRoot)

console.error('[collect] guards...')
const guardKpis = collectFromGuards(repoRoot)

console.error('[collect] docs...')
const docKpis = collectFromDocs(repoRoot)

console.error('[collect] bundle...')
const bundleKpis = collectFromBundle(repoRoot)

console.error('[collect] obligations...')
const obligationKpis = collectObligations(repoRoot, { base })

const allKpis = [...snapshotKpis, ...guardKpis, ...docKpis, ...bundleKpis, ...obligationKpis]
console.error(`[collect] done — ${allKpis.length} KPIs`)

// ---------------------------------------------------------------------------
// 2. 判定
// ---------------------------------------------------------------------------
console.error('[evaluate] applying rules...')
const report = evaluate(allKpis)

// ---------------------------------------------------------------------------
// 3. PR コメントモード
// ---------------------------------------------------------------------------
if (isPrComment) {
  const obligations = reportObligationDetails(repoRoot, { base })
  const comment = renderPrComment(report, obligations, previousReport)
  process.stdout.write(comment + '\n')
  process.exit(report.summary.hardGatePass ? 0 : 1)
}

// ---------------------------------------------------------------------------
// 4. 生成
// ---------------------------------------------------------------------------
if (!isCheck) {
  const jsonPath = renderJson(report, repoRoot)
  console.error(`[render] JSON → ${jsonPath}`)

  const mdPath = renderMd(report, repoRoot)
  console.error(`[render] MD   → ${mdPath}`)

  // Generated section 更新
  const inlineContent = renderInlineSection(report)
  const results = updateGeneratedSections(repoRoot, [
    {
      filePath: 'CLAUDE.md',
      sectionId: 'architecture-health-summary',
      content: inlineContent,
    },
    {
      filePath: 'references/02-status/technical-debt-roadmap.md',
      sectionId: 'architecture-health-summary',
      content: inlineContent,
    },
  ])

  for (const r of results) {
    console.error(`[section] ${r.file} #${r.sectionId}: ${r.status}`)
  }
} else {
  console.error('[check] dry-run mode — no files written')
}

// ---------------------------------------------------------------------------
// 5. サマリー出力
// ---------------------------------------------------------------------------
const s = report.summary
console.error('')
console.error('=== Architecture Health Summary ===')
console.error(`  KPIs:      ${s.totalKpis}`)
console.error(`  OK:        ${s.ok}`)
console.error(`  WARN:      ${s.warn}`)
console.error(`  FAIL:      ${s.fail}`)
console.error(`  Hard Gate: ${s.hardGatePass ? 'PASS' : 'FAIL'}`)

if (s.warn > 0) {
  console.error('')
  console.error('Warnings:')
  for (const kpi of report.kpis) {
    if (kpi.status === 'warn') {
      console.error(`  ⚠ ${kpi.id}: ${kpi.value} (budget: ${kpi.budget})`)
    }
  }
}

if (!s.hardGatePass) {
  console.error('')
  console.error('Hard gate failures:')
  for (const kpi of report.kpis) {
    if (kpi.status === 'fail') {
      console.error(`  ✗ ${kpi.id}: ${kpi.value} (budget: ${kpi.budget})`)
    }
  }
  process.exit(1)
}

console.error('')
console.error('All hard gates passed.')
