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
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { collectFromSnapshot } from './collectors/snapshot-collector.js'
import { collectFromGuards } from './collectors/guard-collector.js'
import { collectFromDocs } from './collectors/doc-collector.js'
import { collectFromBundle } from './collectors/bundle-collector.js'
import { collectObligations, reportObligationDetails } from './collectors/obligation-collector.js'
import { collectFromCiTiming } from './collectors/ci-timing-collector.js'
import { evaluate } from './evaluator.js'
import {
  assessOverall,
  buildCompositeIndicators,
  detectTopRisks,
  detectRecentChanges,
  generateRecommendations,
} from './diagnostics.js'
import { renderJson } from './renderers/json-renderer.js'
import { renderMd } from './renderers/md-renderer.js'
import { renderCertificate, renderCertificateInline } from './renderers/certificate-renderer.js'
import { updateGeneratedSections } from './renderers/section-updater.js'
import { renderPrComment } from './renderers/pr-comment-renderer.js'
import type { HealthReport } from './types.js'
import { HEALTH_RULES } from './config/health-rules.js'

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

console.error('[collect] ci-timing...')
const ciTimingKpis = collectFromCiTiming(repoRoot)

console.error('[collect] obligations...')
const obligationKpis = collectObligations(repoRoot, { base })

const allKpis = [...snapshotKpis, ...guardKpis, ...docKpis, ...bundleKpis, ...ciTimingKpis, ...obligationKpis]
console.error(`[collect] done — ${allKpis.length} KPIs`)

// ---------------------------------------------------------------------------
// 2. 判定
// ---------------------------------------------------------------------------
console.error('[evaluate] applying rules...')
const report = evaluate(allKpis)

// ---------------------------------------------------------------------------
// 3. 診断
// ---------------------------------------------------------------------------
console.error('[diagnose] building certificate...')
const assessment = assessOverall(report, previousReport)
const indicators = buildCompositeIndicators(report, previousReport)
const risks = detectTopRisks(report)
const changes = detectRecentChanges(report, previousReport)
const actions = generateRecommendations(report, previousReport)

// Hard gate details
const hardGateRules = HEALTH_RULES.filter((r) => r.type === 'hard_gate')
const hardGateDetails = hardGateRules.map((rule) => {
  const kpi = report.kpis.find((k) => k.id === rule.id)
  return {
    label: kpi?.label ?? rule.id,
    pass: kpi?.status !== 'fail',
  }
})

const certificateInput = {
  report,
  assessment,
  indicators,
  risks,
  changes,
  actions,
  hardGateDetails,
}

// ---------------------------------------------------------------------------
// 4. PR コメントモード
// ---------------------------------------------------------------------------
if (isPrComment) {
  const obligations = reportObligationDetails(repoRoot, { base })
  const comment = renderPrComment(report, obligations, previousReport)
  process.stdout.write(comment + '\n')
  process.exit(report.summary.hardGatePass ? 0 : 1)
}

// ---------------------------------------------------------------------------
// 5. 生成
// ---------------------------------------------------------------------------
if (!isCheck) {
  const jsonPath = renderJson(report, repoRoot)
  console.error(`[render] JSON       → ${jsonPath}`)

  const mdPath = renderMd(report, repoRoot)
  console.error(`[render] Detail MD  → ${mdPath}`)

  const certPath = renderCertificate(certificateInput, repoRoot)
  console.error(`[render] Certificate → ${certPath}`)

  // Generated section 更新（健康診断書のインライン版）
  const inlineContent = renderCertificateInline(certificateInput)
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
// 6. サマリー出力
// ---------------------------------------------------------------------------
const s = report.summary
console.error('')
console.error(`=== ${assessment.verdict} | ${assessment.trend} ===`)
console.error(`  KPIs:      ${s.totalKpis}`)
console.error(`  OK:        ${s.ok}`)
console.error(`  WARN:      ${s.warn}`)
console.error(`  FAIL:      ${s.fail}`)
console.error(`  Hard Gate: ${s.hardGatePass ? 'PASS' : 'FAIL'}`)

if (risks.length > 0) {
  console.error('')
  console.error('Top risks:')
  for (const risk of risks) {
    console.error(`  - ${risk.label}: ${risk.reason}`)
  }
}

if (actions.length > 0) {
  console.error('')
  console.error('Recommended:')
  for (const action of actions) {
    console.error(`  ${action.action}`)
  }
}

// generate モードでは exit しない（obligation は開発途中で発火するため）
// --check / --pr-comment のみ exit 1
if (!s.hardGatePass && (isCheck || isPrComment)) {
  process.exit(1)
}
