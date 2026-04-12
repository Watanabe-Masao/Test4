/**
 * Guard Collector — ガードテストファイルと guardTagRegistry から KPI を抽出
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'
import { resolveActiveProject } from '../project-resolver.js'

export function collectFromGuards(repoRoot: string): HealthKpi[] {
  const kpis: HealthKpi[] = []

  // --- Guard files count ---
  const guardsDir = resolve(repoRoot, 'app/src/test/guards')
  const guardFiles = readdirSync(guardsDir).filter((f) => f.endsWith('.test.ts'))
  kpis.push({
    id: 'guard.files.count',
    label: 'ガードテストファイル数',
    category: 'guard',
    value: guardFiles.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: guardFiles.map((f) => `app/src/test/guards/${f}`),
  })

  // --- Review-only tags count ---
  const registryPath = resolve(repoRoot, 'app/src/test/guardTagRegistry.ts')
  const registryContent = readFileSync(registryPath, 'utf-8')
  const reviewOnlyMatch = registryContent.match(/REVIEW_ONLY_TAGS[^[]*\[([^\]]*)\]/)
  let reviewOnlyCount = 0
  if (reviewOnlyMatch?.[1]) {
    reviewOnlyCount = reviewOnlyMatch[1]
      .split(',')
      .filter((s) => s.trim().length > 0).length
  }
  kpis.push({
    id: 'guard.reviewOnlyTags.count',
    label: 'レビュー専用タグ数',
    category: 'guard',
    value: reviewOnlyCount,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: ['app/src/test/guardTagRegistry.ts'],
  })

  // --- Architecture Rules total count ---
  // BaseRule の物理正本は App Domain 側（C4: 物理移動完了）
  // quote-agnostic: Prettier が single/double どちらの quote を採用しても
  // 検出できるようにする（fixNow detection と同じ方針）
  const rulesPath = resolve(repoRoot, 'app-domain/gross-profit/rule-catalog/base-rules.ts')
  const rulesContent = readFileSync(rulesPath, 'utf-8')
  const ruleIdMatches = rulesContent.match(/id:\s*['"]AR-/g) || []
  kpis.push({
    id: 'guard.rules.total',
    label: '総 Architecture Rule 数',
    category: 'guard',
    value: ruleIdMatches.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [{ kind: 'definition', path: 'references/03-guides/architecture-rule-system.md' }],
    implRefs: ['app-domain/gross-profit/rule-catalog/base-rules.ts'],
  })

  // --- fixNow distribution（Project Overlay 側正本） ---
  // Project Overlay の位置は project-resolver 経由で解決する（C1: project 固定パス一元化）
  const activeProject = resolveActiveProject(repoRoot)
  const overlayPath = activeProject.absOverlayEntry
  const overlayContent = readFileSync(overlayPath, 'utf-8')
  // quote-agnostic: overlay が Prettier により single/double quote どちらになっても動く
  const fixNowNow = (overlayContent.match(/fixNow:\s*['"]now['"]/g) || []).length
  const fixNowDebt = (overlayContent.match(/fixNow:\s*['"]debt['"]/g) || []).length
  const fixNowReview = (overlayContent.match(/fixNow:\s*['"]review['"]/g) || []).length
  kpis.push({
    id: 'guard.rules.fixNow.now',
    label: 'fixNow=now ルール数（即修正）',
    category: 'guard',
    value: fixNowNow,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })
  kpis.push({
    id: 'guard.rules.fixNow.debt',
    label: 'fixNow=debt ルール数（構造負債）',
    category: 'guard',
    value: fixNowDebt,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })
  kpis.push({
    id: 'guard.rules.fixNow.review',
    label: 'fixNow=review ルール数（観測）',
    category: 'guard',
    value: fixNowReview,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  return kpis
}
