/**
 * Content Spec Collector — Phase H deliverable
 *
 * 役割: `references/05-contents/` 配下の全 spec (widget / read-model / calculation /
 * chart / ui-component) を集計し、`content-spec-health.json` を出力する。
 * KPI として `contentSpec.*` を architecture-health に feed する。
 *
 * 検出ロジックは AR-CONTENT-SPEC-* 9 rule の guard 群が担う。本 collector は
 * **集計 only**（読み取り専用）。
 *
 * 出力 KPI（architecture-health.json への feed）:
 *   - contentSpec.total            (count)
 *   - contentSpec.missingOwner     (count, budget 0)
 *   - contentSpec.stale            (count, budget 5)
 *   - contentSpec.lifecycleViolation (count, budget 0)
 *   - contentSpec.evidenceUncovered (count, budget 9 で ratchet-down)
 *
 * 詳細出力 (`content-spec-health.json` のみ):
 *   - byKind 内訳 / lifecycle 状態分布 / evidence カバレッジ詳細
 *
 * @see projects/completed/phased-content-specs-rollout/plan.md §Phase H
 * @see references/05-contents/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import type { HealthKpi } from '../types.js'

// ---------------------------------------------------------------------------
// 最小 frontmatter parser (contentSpecHelpers.ts と同等の subset)
// ---------------------------------------------------------------------------

interface SpecFrontmatter {
  readonly id: string
  readonly kind: 'widget' | 'read-model' | 'calculation' | 'chart' | 'ui-component'
  readonly owner: string | null
  readonly reviewCadenceDays: number | null
  readonly lastReviewedAt: string | null
  readonly lifecycleStatus: string
  readonly replacedBy: string | null
  readonly supersedes: string | null
  readonly sunsetCondition: string | null
  readonly deadline: string | null
  readonly storiesCount: number
  readonly visualTestsCount: number
}

function inferKindFromId(id: string): SpecFrontmatter['kind'] | null {
  if (/^WID-\d{3}$/.test(id)) return 'widget'
  if (/^RM-\d{3}$/.test(id)) return 'read-model'
  if (/^CALC-\d{3}$/.test(id)) return 'calculation'
  if (/^CHART-\d{3}$/.test(id)) return 'chart'
  if (/^UIC-\d{3}$/.test(id)) return 'ui-component'
  return null
}

function parseScalar(s: string): unknown {
  if (s === 'null' || s === '~' || s === '') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === '[]') return []
  if (s === '{}') return {}
  if (/^-?\d+$/.test(s)) return Number(s)
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1)
  }
  return s
}

function parseFrontmatter(specPath: string): SpecFrontmatter | null {
  const content = readFileSync(specPath, 'utf-8')
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const raw: Record<string, unknown> = {}
  const lines = m[1].split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++
      continue
    }
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!km) {
      i++
      continue
    }
    const key = km[1]
    const valueRaw = km[2].trim()
    if (valueRaw === '') {
      const block: string[] = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j]
        if (next.trim() === '' || next.trim().startsWith('#')) {
          j++
          continue
        }
        if (!next.startsWith('  ')) break
        block.push(next)
        j++
      }
      if (block.length > 0 && block.every((l) => l.trim().startsWith('- '))) {
        raw[key] = block.map((l) => parseScalar(l.trim().slice(2).trim()))
      } else if (block.length > 0) {
        const obj: Record<string, unknown> = {}
        for (const l of block) {
          const om = l.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/)
          if (om) obj[om[1]] = parseScalar(om[2].trim())
        }
        raw[key] = obj
      } else {
        raw[key] = []
      }
      i = j
    } else {
      raw[key] = parseScalar(valueRaw)
      i++
    }
  }
  const id = String(raw.id ?? '')
  const kind = inferKindFromId(id)
  if (!kind) return null
  const stories = Array.isArray(raw.stories) ? raw.stories : []
  const visualTests = Array.isArray(raw.visualTests) ? raw.visualTests : []
  return {
    id,
    kind,
    owner: typeof raw.owner === 'string' ? raw.owner : null,
    reviewCadenceDays: typeof raw.reviewCadenceDays === 'number' ? raw.reviewCadenceDays : null,
    lastReviewedAt: typeof raw.lastReviewedAt === 'string' ? raw.lastReviewedAt : null,
    lifecycleStatus: typeof raw.lifecycleStatus === 'string' ? raw.lifecycleStatus : 'active',
    replacedBy: typeof raw.replacedBy === 'string' ? raw.replacedBy : null,
    supersedes: typeof raw.supersedes === 'string' ? raw.supersedes : null,
    sunsetCondition: typeof raw.sunsetCondition === 'string' ? raw.sunsetCondition : null,
    deadline: typeof raw.deadline === 'string' ? raw.deadline : null,
    storiesCount: stories.length,
    visualTestsCount: visualTests.length,
  }
}

// ---------------------------------------------------------------------------
// Spec 列挙
// ---------------------------------------------------------------------------

const KIND_DIRS: Record<SpecFrontmatter['kind'], string> = {
  widget: 'widgets',
  'read-model': 'read-models',
  calculation: 'calculations',
  chart: 'charts',
  'ui-component': 'ui-components',
}

function listAllSpecs(repoRoot: string): SpecFrontmatter[] {
  const base = resolve(repoRoot, 'references/05-contents')
  const out: SpecFrontmatter[] = []
  for (const [kind, dir] of Object.entries(KIND_DIRS)) {
    const fullDir = join(base, dir)
    if (!existsSync(fullDir)) continue
    const re =
      kind === 'widget'
        ? /^WID-\d{3}\.md$/
        : kind === 'read-model'
          ? /^RM-\d{3}\.md$/
          : kind === 'calculation'
            ? /^CALC-\d{3}\.md$/
            : kind === 'chart'
              ? /^CHART-\d{3}\.md$/
              : /^UIC-\d{3}\.md$/
    const files = readdirSync(fullDir).filter((f) => re.test(f))
    for (const f of files) {
      const spec = parseFrontmatter(join(fullDir, f))
      if (spec) out.push(spec)
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

const VISUAL_EVIDENCE_BASELINE = 9 // contentSpecVisualEvidenceGuard と同期
const STALE_BUDGET = 5 // freshness 超過の許容数 (Drift Budget)

const MS_PER_DAY = 24 * 60 * 60 * 1000

function ageInDays(lastReviewedAt: string, today: Date): number {
  const reviewed = new Date(lastReviewedAt + 'T00:00:00Z')
  if (Number.isNaN(reviewed.getTime())) return Number.POSITIVE_INFINITY
  return Math.floor((today.getTime() - reviewed.getTime()) / MS_PER_DAY)
}

interface ContentSpecHealthOutput {
  readonly $schema: string
  readonly generatedAt: string
  readonly contentSpec: {
    readonly total: number
    readonly byKind: Record<string, number>
    readonly missingOwner: number
    readonly stale: number
    readonly lifecycleViolation: number
    readonly lifecycle: Record<string, number>
    readonly evidence: {
      readonly targetTotal: number
      readonly covered: number
      readonly uncovered: number
      readonly baseline: number
      readonly byKind: { chart: { total: number; covered: number }; uiComponent: { total: number; covered: number } }
    }
    readonly driftBudget: {
      readonly missingOwner: { value: number; budget: number }
      readonly stale: { value: number; budget: number }
      readonly lifecycleViolation: { value: number; budget: number }
      readonly evidenceUncovered: { value: number; budget: number }
    }
  }
}

export function collectContentSpecHealth(repoRoot: string): ContentSpecHealthOutput {
  const specs = listAllSpecs(repoRoot)
  const today = new Date()
  const byKind: Record<string, number> = {}
  const lifecycle: Record<string, number> = {
    active: 0,
    proposed: 0,
    deprecated: 0,
    sunsetting: 0,
    retired: 0,
    archived: 0,
  }
  let missingOwner = 0
  let stale = 0
  let lifecycleViolation = 0
  let chartTotal = 0
  let chartCovered = 0
  let uiComponentTotal = 0
  let uiComponentCovered = 0

  for (const s of specs) {
    byKind[s.kind] = (byKind[s.kind] ?? 0) + 1
    lifecycle[s.lifecycleStatus] = (lifecycle[s.lifecycleStatus] ?? 0) + 1

    if (!s.owner || s.owner.trim() === '') missingOwner++

    if (s.lastReviewedAt && s.reviewCadenceDays != null) {
      const age = ageInDays(s.lastReviewedAt, today)
      if (age > s.reviewCadenceDays) stale++
    }

    // lifecycle violation: deprecated/sunsetting/retired without replacedBy,
    // or sunsetting without sunsetCondition+deadline
    const requiresReplacedBy = ['deprecated', 'sunsetting', 'retired'].includes(s.lifecycleStatus)
    if (requiresReplacedBy && (!s.replacedBy || s.replacedBy.trim() === '')) {
      lifecycleViolation++
    }
    if (s.lifecycleStatus === 'sunsetting') {
      if (!s.sunsetCondition || s.sunsetCondition.trim() === '') lifecycleViolation++
      if (!s.deadline || s.deadline.trim() === '') lifecycleViolation++
    }

    if (s.kind === 'chart') {
      chartTotal++
      if (s.storiesCount > 0 || s.visualTestsCount > 0) chartCovered++
    }
    if (s.kind === 'ui-component') {
      uiComponentTotal++
      if (s.storiesCount > 0 || s.visualTestsCount > 0) uiComponentCovered++
    }
  }

  const evidenceCovered = chartCovered + uiComponentCovered
  const evidenceTargetTotal = chartTotal + uiComponentTotal
  const evidenceUncovered = evidenceTargetTotal - evidenceCovered

  return {
    $schema: 'content-spec-health-v1',
    generatedAt: new Date().toISOString(),
    contentSpec: {
      total: specs.length,
      byKind,
      missingOwner,
      stale,
      lifecycleViolation,
      lifecycle,
      evidence: {
        targetTotal: evidenceTargetTotal,
        covered: evidenceCovered,
        uncovered: evidenceUncovered,
        baseline: VISUAL_EVIDENCE_BASELINE,
        byKind: {
          chart: { total: chartTotal, covered: chartCovered },
          uiComponent: { total: uiComponentTotal, covered: uiComponentCovered },
        },
      },
      driftBudget: {
        missingOwner: { value: missingOwner, budget: 0 },
        stale: { value: stale, budget: STALE_BUDGET },
        lifecycleViolation: { value: lifecycleViolation, budget: 0 },
        evidenceUncovered: { value: evidenceUncovered, budget: VISUAL_EVIDENCE_BASELINE },
      },
    },
  }
}

export function writeContentSpecHealth(repoRoot: string): ContentSpecHealthOutput {
  const output = collectContentSpecHealth(repoRoot)
  const outPath = resolve(
    repoRoot,
    'references/02-status/generated/content-spec-health.json',
  )
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8')
  return output
}

// ---------------------------------------------------------------------------
// architecture-health.json への feed (5 KPI)
// ---------------------------------------------------------------------------

export function collectFromContentSpec(repoRoot: string): readonly HealthKpi[] {
  const out = collectContentSpecHealth(repoRoot)
  const cs = out.contentSpec
  return [
    {
      id: 'contentSpec.total',
      label: 'Content Spec 総数 (全 kind)',
      category: 'docs',
      value: cs.total,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs: [
        { kind: 'definition', path: 'references/05-contents/README.md' },
      ],
      implRefs: [
        'tools/architecture-health/src/collectors/content-spec-collector.ts',
        'references/02-status/generated/content-spec-health.json',
      ],
    },
    {
      id: 'contentSpec.missingOwner',
      label: 'Content Spec: owner 未設定数',
      category: 'docs',
      value: cs.missingOwner,
      unit: 'count',
      status: cs.missingOwner > 0 ? 'fail' : 'ok',
      budget: 0,
      owner: 'documentation-steward',
      docRefs: [
        { kind: 'definition', path: 'app-domain/gross-profit/rule-catalog/base-rules.ts', section: 'AR-CONTENT-SPEC-OWNER' },
      ],
      implRefs: ['app/src/test/guards/contentSpecOwnerGuard.test.ts'],
    },
    {
      id: 'contentSpec.stale',
      label: 'Content Spec: lastReviewedAt cadence 超過数',
      category: 'docs',
      value: cs.stale,
      unit: 'count',
      status: cs.stale > STALE_BUDGET ? 'fail' : cs.stale > 0 ? 'warn' : 'ok',
      budget: STALE_BUDGET,
      owner: 'documentation-steward',
      docRefs: [
        { kind: 'definition', path: 'app-domain/gross-profit/rule-catalog/base-rules.ts', section: 'AR-CONTENT-SPEC-FRESHNESS' },
      ],
      implRefs: ['app/src/test/guards/contentSpecFreshnessGuard.test.ts'],
    },
    {
      id: 'contentSpec.lifecycleViolation',
      label: 'Content Spec: lifecycle 必須 field 違反数',
      category: 'docs',
      value: cs.lifecycleViolation,
      unit: 'count',
      status: cs.lifecycleViolation > 0 ? 'fail' : 'ok',
      budget: 0,
      owner: 'architecture',
      docRefs: [
        { kind: 'definition', path: 'app-domain/gross-profit/rule-catalog/base-rules.ts', section: 'AR-CONTENT-SPEC-LIFECYCLE-FIELDS' },
        { kind: 'definition', path: 'references/03-guides/promote-ceremony-pr-template.md' },
      ],
      implRefs: ['app/src/test/guards/contentSpecLifecycleGuard.test.ts'],
    },
    {
      id: 'contentSpec.evidenceUncovered',
      label: 'Content Spec: chart/UIC visual evidence 未整備数',
      category: 'docs',
      value: cs.evidence.uncovered,
      unit: 'count',
      status: cs.evidence.uncovered > VISUAL_EVIDENCE_BASELINE ? 'fail' : 'ok',
      budget: VISUAL_EVIDENCE_BASELINE,
      owner: 'implementation',
      docRefs: [
        { kind: 'definition', path: 'app-domain/gross-profit/rule-catalog/base-rules.ts', section: 'AR-CONTENT-SPEC-VISUAL-EVIDENCE' },
      ],
      implRefs: ['app/src/test/guards/contentSpecVisualEvidenceGuard.test.ts'],
    },
  ]
}
