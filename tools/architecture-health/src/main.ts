/**
 * Architecture Health — メインエントリポイント
 *
 * 実行: npx tsx tools/architecture-health/src/main.ts [--check]
 *
 * --check: generated section の更新をせず、hard gate の PASS/FAIL のみ判定
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectFromSnapshot } from './collectors/snapshot-collector.js'
import { collectFromGuards } from './collectors/guard-collector.js'
import { collectFromDocs } from './collectors/doc-collector.js'
import { evaluate } from './evaluator.js'
import { renderJson } from './renderers/json-renderer.js'
import { renderMd, renderInlineSection } from './renderers/md-renderer.js'
import { updateGeneratedSections } from './renderers/section-updater.js'

const isCheck = process.argv.includes('--check')
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

// ---------------------------------------------------------------------------
// 1. 収集
// ---------------------------------------------------------------------------
console.log('[collect] snapshot...')
const snapshotKpis = collectFromSnapshot(repoRoot)

console.log('[collect] guards...')
const guardKpis = collectFromGuards(repoRoot)

console.log('[collect] docs...')
const docKpis = collectFromDocs(repoRoot)

const allKpis = [...snapshotKpis, ...guardKpis, ...docKpis]
console.log(`[collect] done — ${allKpis.length} KPIs`)

// ---------------------------------------------------------------------------
// 2. 判定
// ---------------------------------------------------------------------------
console.log('[evaluate] applying rules...')
const report = evaluate(allKpis)

// ---------------------------------------------------------------------------
// 3. 生成
// ---------------------------------------------------------------------------
const jsonPath = renderJson(report, repoRoot)
console.log(`[render] JSON → ${jsonPath}`)

const mdPath = renderMd(report, repoRoot)
console.log(`[render] MD   → ${mdPath}`)

// ---------------------------------------------------------------------------
// 4. Generated section 更新
// ---------------------------------------------------------------------------
if (!isCheck) {
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
    console.log(`[section] ${r.file} #${r.sectionId}: ${r.status}`)
  }
}

// ---------------------------------------------------------------------------
// 5. サマリー出力
// ---------------------------------------------------------------------------
const s = report.summary
console.log('')
console.log('=== Architecture Health Summary ===')
console.log(`  KPIs:      ${s.totalKpis}`)
console.log(`  OK:        ${s.ok}`)
console.log(`  WARN:      ${s.warn}`)
console.log(`  FAIL:      ${s.fail}`)
console.log(`  Hard Gate: ${s.hardGatePass ? 'PASS' : 'FAIL'}`)

if (!s.hardGatePass) {
  console.log('')
  console.log('Hard gate failures:')
  for (const kpi of report.kpis) {
    if (kpi.status === 'fail') {
      console.log(`  - ${kpi.id}: ${kpi.value} (budget: ${kpi.budget})`)
    }
  }
  process.exit(1)
}

console.log('')
console.log('All hard gates passed.')
