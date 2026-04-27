/**
 * Content Spec Guards 共有 helper
 *
 * Phase A scope: Anchor Slice 5 件 (WID-002 / 006 / 018 / 033 / 040) のみを
 * 対象にする。Phase B で対象を 45 件に拡大する。
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
export const SPECS_DIR = resolve(REPO_ROOT, 'references/05-contents/widgets')

/**
 * Phase A Anchor Slice — Phase B 完了後 (2026-04-27) は guard scope を全 45 WID に
 * 拡大したため、本定数は遺贄（archived umbrella 参照や documentation 用）として
 * 保持する。実 scope は `listAllWids()` が disk から discover する。
 */
export const PHASE_A_ANCHOR_WIDS: readonly string[] = [
  'WID-002',
  'WID-006',
  'WID-018',
  'WID-033',
  'WID-040',
]

/**
 * `references/05-contents/widgets/WID-NNN.md` を全列挙する（Phase B scope）。
 * Phase A は PHASE_A_ANCHOR_WIDS の 5 件、Phase B 以降は disk discovery で全 45 件。
 */
export function listAllWids(): readonly string[] {
  return readdirSync(SPECS_DIR)
    .filter((f) => /^WID-\d{3}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

export interface SpecFrontmatter {
  readonly id: string
  readonly widgetDefId: string
  readonly registry: string
  readonly registrySource: string
  readonly registryLine: number
  readonly owner: string | null
  readonly reviewCadenceDays: number | null
  readonly lastReviewedAt: string | null
  readonly lastVerifiedCommit: string | null
  readonly raw: Record<string, unknown>
}

/**
 * widget spec frontmatter 専用の最小 YAML パーサ。
 * tools/widget-specs/generate.mjs と同等の subset をサポートする。
 */
export function parseSpecFrontmatter(specPath: string): SpecFrontmatter {
  const content = readFileSync(specPath, 'utf-8')
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) {
    throw new Error(`Invalid frontmatter in ${specPath}`)
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
  return {
    id: String(raw.id ?? ''),
    widgetDefId: String(raw.widgetDefId ?? ''),
    registry: String(raw.registry ?? ''),
    registrySource: String(raw.registrySource ?? ''),
    registryLine: typeof raw.registryLine === 'number' ? raw.registryLine : 0,
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

export function specPath(wid: string): string {
  return resolve(SPECS_DIR, `${wid}.md`)
}

export function loadAnchorSpecs(): SpecFrontmatter[] {
  return PHASE_A_ANCHOR_WIDS.map((wid) => parseSpecFrontmatter(specPath(wid)))
}

/**
 * 全 WID-NNN.md spec を frontmatter parse して返す（Phase B scope）。
 */
export function loadAllSpecs(): SpecFrontmatter[] {
  return listAllWids().map((wid) => parseSpecFrontmatter(specPath(wid)))
}

/**
 * source TSX 内で `id: '<widgetDefId>'` の行番号を返す（1-indexed）。
 * 見つからなければ 0。
 */
export function findIdLine(sourceContent: string, widgetDefId: string): number {
  const lines = sourceContent.split('\n')
  const re = new RegExp(`^\\s*id:\\s*['"\`]${escapeRegex(widgetDefId)}['"\`]`)
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1
  }
  return 0
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function readSourceContent(spec: SpecFrontmatter): string | null {
  const full = resolve(REPO_ROOT, spec.registrySource)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}
