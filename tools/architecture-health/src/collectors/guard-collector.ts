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

  return kpis
}
