/**
 * Guard Collector — ガードテストファイルと guardTagRegistry から KPI を抽出
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

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
  const rulesPath = resolve(repoRoot, 'app/src/test/architectureRules/rules.ts')
  const rulesContent = readFileSync(rulesPath, 'utf-8')
  const ruleIdMatches = rulesContent.match(/id: 'AR-/g) || []
  kpis.push({
    id: 'guard.rules.total',
    label: '総 Architecture Rule 数',
    category: 'guard',
    value: ruleIdMatches.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [{ kind: 'definition', path: 'references/03-guides/architecture-rule-system.md' }],
    implRefs: ['app/src/test/architectureRules/rules.ts'],
  })

  // --- fixNow distribution ---
  const fixNowNow = (rulesContent.match(/fixNow: 'now'/g) || []).length
  const fixNowDebt = (rulesContent.match(/fixNow: 'debt'/g) || []).length
  const fixNowReview = (rulesContent.match(/fixNow: 'review'/g) || []).length
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
