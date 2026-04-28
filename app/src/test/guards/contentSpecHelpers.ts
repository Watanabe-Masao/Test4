/**
 * Content Spec Guards 共有 helper
 *
 * Phase A: Anchor Slice 5 widget scope。
 * Phase B (2026-04-27): 全 45 WID に拡大、disk discovery 化。
 * Phase C (2026-04-27): kind=read-model を追加 (RM-NNN.md)、kind 別 dispatch 化。
 *
 * 各 guard で重複していた frontmatter 読み取り / source 検出ロジックを集約する。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const REPO_ROOT = resolve(__dirname, '../../../..')
export const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')
export const SPECS_WIDGETS_DIR = resolve(SPECS_BASE, 'widgets')
export const SPECS_READ_MODELS_DIR = resolve(SPECS_BASE, 'read-models')

/** Phase A 起源の Anchor Slice 5 widget — documentation / archived umbrella 参照向けに保持。 */
export const PHASE_A_ANCHOR_WIDS: readonly string[] = [
  'WID-002',
  'WID-006',
  'WID-018',
  'WID-033',
  'WID-040',
]

export type SpecKind = 'widget' | 'read-model' | 'calculation' | 'chart' | 'ui-component'

/** id prefix から kind を推定する。未知の prefix は null。 */
export function inferKindFromId(id: string): SpecKind | null {
  if (/^WID-\d{3}$/.test(id)) return 'widget'
  if (/^RM-\d{3}$/.test(id)) return 'read-model'
  if (/^CALC-\d{3}$/.test(id)) return 'calculation'
  if (/^CHART-\d{3}$/.test(id)) return 'chart'
  if (/^UIC-\d{3}$/.test(id)) return 'ui-component'
  return null
}

export const SPECS_CALCULATIONS_DIR = resolve(SPECS_BASE, 'calculations')
export const SPECS_CHARTS_DIR = resolve(SPECS_BASE, 'charts')
export const SPECS_UI_COMPONENTS_DIR = resolve(SPECS_BASE, 'ui-components')

export function specPathFor(id: string): string {
  const kind = inferKindFromId(id)
  if (kind === 'widget') return resolve(SPECS_WIDGETS_DIR, `${id}.md`)
  if (kind === 'read-model') return resolve(SPECS_READ_MODELS_DIR, `${id}.md`)
  if (kind === 'calculation') return resolve(SPECS_CALCULATIONS_DIR, `${id}.md`)
  if (kind === 'chart') return resolve(SPECS_CHARTS_DIR, `${id}.md`)
  if (kind === 'ui-component') return resolve(SPECS_UI_COMPONENTS_DIR, `${id}.md`)
  throw new Error(`Unknown id format: ${id}`)
}

export function listAllWids(): readonly string[] {
  return readdirSync(SPECS_WIDGETS_DIR)
    .filter((f) => /^WID-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

export function listAllReadModels(): readonly string[] {
  if (!existsSync(SPECS_READ_MODELS_DIR)) return []
  return readdirSync(SPECS_READ_MODELS_DIR)
    .filter((f) => /^RM-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

export function listAllCalculations(): readonly string[] {
  if (!existsSync(SPECS_CALCULATIONS_DIR)) return []
  return readdirSync(SPECS_CALCULATIONS_DIR)
    .filter((f) => /^CALC-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

export function listAllCharts(): readonly string[] {
  if (!existsSync(SPECS_CHARTS_DIR)) return []
  return readdirSync(SPECS_CHARTS_DIR)
    .filter((f) => /^CHART-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

export function listAllUiComponents(): readonly string[] {
  if (!existsSync(SPECS_UI_COMPONENTS_DIR)) return []
  return readdirSync(SPECS_UI_COMPONENTS_DIR)
    .filter((f) => /^UIC-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

/** 全 kind の spec id を列挙（widget + read-model + calculation + chart + ui-component）。 */
export function listAllSpecIds(): readonly string[] {
  return [
    ...listAllWids(),
    ...listAllReadModels(),
    ...listAllCalculations(),
    ...listAllCharts(),
    ...listAllUiComponents(),
  ].sort()
}

export type LifecycleStatus =
  | 'proposed'
  | 'active'
  | 'deprecated'
  | 'sunsetting'
  | 'retired'
  | 'archived'

export interface SpecFrontmatter {
  readonly id: string
  readonly kind: SpecKind
  // widget 系 field (kind=widget でのみ意味を持つ)
  readonly widgetDefId: string
  readonly registry: string
  readonly registrySource: string
  readonly registryLine: number
  // read-model / calculation 系 field
  readonly exportName: string
  readonly sourceRef: string
  readonly sourceLine: number
  // calculation 固有 (registry sync)
  readonly contractId: string | null
  readonly canonicalRegistration: string | null // 'current' | 'candidate' | 'non-target'
  // lifecycle 共通 (Phase D で active 化、kind 横断)
  readonly lifecycleStatus: LifecycleStatus
  readonly replacedBy: string | null
  readonly supersedes: string | null
  readonly sunsetCondition: string | null
  readonly deadline: string | null
  // 共通 field
  readonly owner: string | null
  readonly reviewCadenceDays: number | null
  readonly lastReviewedAt: string | null
  readonly lastVerifiedCommit: string | null
  readonly raw: Record<string, unknown>
}

export function parseSpecFrontmatter(path: string): SpecFrontmatter {
  const content = readFileSync(path, 'utf-8')
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) {
    throw new Error(`Invalid frontmatter in ${path}`)
  }
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
  const idStr = String(raw.id ?? '')
  const kind = inferKindFromId(idStr) ?? 'widget'
  const lifecycleStatus = (
    typeof raw.lifecycleStatus === 'string' ? raw.lifecycleStatus : 'active'
  ) as LifecycleStatus
  return {
    id: idStr,
    kind,
    widgetDefId: String(raw.widgetDefId ?? ''),
    registry: String(raw.registry ?? ''),
    registrySource: String(raw.registrySource ?? ''),
    registryLine: typeof raw.registryLine === 'number' ? raw.registryLine : 0,
    exportName: String(raw.exportName ?? ''),
    sourceRef: String(raw.sourceRef ?? ''),
    sourceLine: typeof raw.sourceLine === 'number' ? raw.sourceLine : 0,
    contractId: typeof raw.contractId === 'string' ? raw.contractId : null,
    canonicalRegistration:
      typeof raw.canonicalRegistration === 'string' ? raw.canonicalRegistration : null,
    lifecycleStatus,
    replacedBy: typeof raw.replacedBy === 'string' ? raw.replacedBy : null,
    supersedes: typeof raw.supersedes === 'string' ? raw.supersedes : null,
    sunsetCondition: typeof raw.sunsetCondition === 'string' ? raw.sunsetCondition : null,
    deadline: typeof raw.deadline === 'string' ? raw.deadline : null,
    owner: typeof raw.owner === 'string' ? raw.owner : null,
    reviewCadenceDays: typeof raw.reviewCadenceDays === 'number' ? raw.reviewCadenceDays : null,
    lastReviewedAt: typeof raw.lastReviewedAt === 'string' ? raw.lastReviewedAt : null,
    lastVerifiedCommit: typeof raw.lastVerifiedCommit === 'string' ? raw.lastVerifiedCommit : null,
    raw,
  }
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

/** 後方互換 alias — Phase B までは widgets-only だった頃の名前。 */
export const SPECS_DIR = SPECS_WIDGETS_DIR
export function specPath(id: string): string {
  return specPathFor(id)
}

export function loadAnchorSpecs(): SpecFrontmatter[] {
  return PHASE_A_ANCHOR_WIDS.map((id) => parseSpecFrontmatter(specPathFor(id)))
}

/** 全 spec (widget + read-model) を frontmatter parse して返す。 */
export function loadAllSpecs(): SpecFrontmatter[] {
  return listAllSpecIds().map((id) => parseSpecFrontmatter(specPathFor(id)))
}

/** source TSX/TS 内で widget id literal の行番号を返す（1-indexed）。見つからなければ 0。 */
export function findIdLine(sourceContent: string, widgetDefId: string): number {
  const lines = sourceContent.split('\n')
  const re = new RegExp(`^\\s*id:\\s*['"\`]${escapeRegex(widgetDefId)}['"\`]`)
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1
  }
  return 0
}

/** source TS 内で `export <kind> <name>` の行番号を返す（1-indexed）。見つからなければ 0。 */
export function findExportLine(sourceContent: string, exportName: string): number {
  const lines = sourceContent.split('\n')
  const n = escapeRegex(exportName)
  const re = new RegExp(
    `^\\s*export\\s+(?:async\\s+)?(?:function|const|let|var|class|interface|type)\\s+${n}\\b`,
  )
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1
  }
  return 0
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** spec の source ファイル (kind=widget→registrySource / kind=read-model|calculation→sourceRef) を読む。 */
export function readSourceContent(spec: SpecFrontmatter): string | null {
  const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
  if (!path) return null
  const full = resolve(REPO_ROOT, path)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}
