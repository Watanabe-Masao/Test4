/**
 * Doc Collector — ドキュメント整合性 KPI を収集
 *
 * - obsolete terms の残存
 * - generated section の鮮度（マーカーの有無と内容一致）
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

interface PrinciplesContract {
  readonly obsoleteTerms: readonly string[]
}

const SCAN_TARGETS = [
  'CLAUDE.md',
  'README.md',
  'CONTRIBUTING.md',
  'app/README.md',
  'references/README.md',
  'references/01-foundation/design-principles.md',
  'references/04-tracking/technical-debt-roadmap.md',
  'references/04-tracking/open-issues.md',
  'references/04-tracking/recent-changes.generated.md',
  'references/03-implementation/widget-coordination-architecture.md',
] as const

const GENERATED_SECTION_FILES = [
  'CLAUDE.md',
  'references/04-tracking/technical-debt-roadmap.md',
] as const

export function collectFromDocs(repoRoot: string): HealthKpi[] {
  const kpis: HealthKpi[] = []

  // --- Obsolete terms ---
  const principlesPath = resolve(repoRoot, 'docs/contracts/principles.json')
  if (existsSync(principlesPath)) {
    const principles: PrinciplesContract = JSON.parse(
      readFileSync(principlesPath, 'utf-8'),
    )

    let totalObsolete = 0
    for (const target of SCAN_TARGETS) {
      const filePath = resolve(repoRoot, target)
      if (!existsSync(filePath)) continue
      const content = readFileSync(filePath, 'utf-8')
      for (const term of principles.obsoleteTerms) {
        if (content.includes(term)) totalObsolete++
      }
    }

    kpis.push({
      id: 'docs.obsoleteTerms.count',
      label: '廃止用語残存数',
      category: 'docs',
      value: totalObsolete,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs: [],
      implRefs: [],
    })
  }

  // --- Generated sections staleness ---
  let staleCount = 0
  for (const target of GENERATED_SECTION_FILES) {
    const filePath = resolve(repoRoot, target)
    if (!existsSync(filePath)) {
      staleCount++
      continue
    }
    const content = readFileSync(filePath, 'utf-8')
    // generated section が存在しない場合は stale とカウント
    const startMarkers = content.match(/<!-- GENERATED:START /g)
    const endMarkers = content.match(/<!-- GENERATED:END /g)
    if (!startMarkers || !endMarkers) {
      staleCount++
    } else if (startMarkers.length !== endMarkers.length) {
      staleCount++
    }
  }

  kpis.push({
    id: 'docs.generatedSections.stale',
    label: 'Generated section 未更新',
    category: 'docs',
    value: staleCount,
    unit: 'count',
    status: 'ok',
    owner: 'documentation-steward',
    docRefs: [],
    implRefs: ['tools/architecture-health/src/renderers/section-updater.ts'],
  })

  return kpis
}
