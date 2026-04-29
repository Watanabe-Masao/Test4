/**
 * Content Spec Guards 共有 helper — I/O wrapper for `app-domain/integrity/`
 *
 * **Phase E (Legacy Retirement、2026-04-28)**:
 * 純粋関数 (parseSpecFrontmatter / inferKindFromId / findIdLine / findExportLine /
 * SpecFrontmatter 等) は `app-domain/integrity/` で正本化済。本 file からは re-export
 * 層を撤去し、deprecation marker も解除した。本 file の役割は filesystem I/O を
 * domain pure 関数に橋渡しする adapter として stable に確定した。
 *
 * 役割 (確定):
 *  - filesystem 定数 (REPO_ROOT / SPECS_*)
 *  - listAll* / specPathFor (filesystem 走査 + path 構築)
 *  - parseSpecFrontmatter (file path → readFileSync → domain `parseSpecFrontmatter`)
 *  - readSourceContent (spec → source file content、I/O)
 *  - loadAllSpecs / loadAnchorSpecs (orchestration: list → parse all)
 *
 * 純粋関数 / 型は **必ず `@app-domain/integrity` から import** する。
 * 本 file には pure re-export を新たに追加してはならない (G8 mechanism)。
 *
 * Phase 履歴:
 *  - Phase A: Anchor Slice 5 widget scope
 *  - Phase B (2026-04-27): 全 45 WID に拡大、disk discovery 化
 *  - Phase C (2026-04-27): kind=read-model を追加 (RM-NNN.md)、kind 別 dispatch 化
 *  - canonicalization Phase B/B-6/B-7 (2026-04-28): pure helper 群を `app-domain/integrity/`
 *    に crystallize、本 file は I/O wrapper + 後方互換 re-export に痩身
 *  - canonicalization Phase E (2026-04-28): 11 contentSpec*Guard が
 *    `@app-domain/integrity` 直接 import に切替完了、本 file から re-export 層を撤去
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  parseSpecFrontmatter as parseSpecFrontmatterPure,
  inferKindFromId,
  type SpecFrontmatter,
} from '@app-domain/integrity'

// ── filesystem 定数 (本 file に残置: I/O 依存) ──

export const REPO_ROOT = resolve(__dirname, '../../../..')
export const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')
export const SPECS_WIDGETS_DIR = resolve(SPECS_BASE, 'widgets')
export const SPECS_READ_MODELS_DIR = resolve(SPECS_BASE, 'read-models')
export const SPECS_CALCULATIONS_DIR = resolve(SPECS_BASE, 'calculations')
export const SPECS_CHARTS_DIR = resolve(SPECS_BASE, 'charts')
export const SPECS_UI_COMPONENTS_DIR = resolve(SPECS_BASE, 'ui-components')

/** Phase A 起源の Anchor Slice 5 widget — documentation / archived umbrella 参照向けに保持。 */
export const PHASE_A_ANCHOR_WIDS: readonly string[] = [
  'WID-002',
  'WID-006',
  'WID-018',
  'WID-033',
  'WID-040',
]

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

/**
 * I/O wrapper around domain `parseSpecFrontmatter`.
 *
 * Reads the file then delegates parsing to the pure domain primitive.
 * Existing call sites use `parseSpecFrontmatter(path)` so signature is preserved.
 */
export function parseSpecFrontmatter(path: string): SpecFrontmatter {
  const content = readFileSync(path, 'utf-8')
  return parseSpecFrontmatterPure(content, path)
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

/** spec の source ファイル (kind=widget→registrySource / kind=read-model|calculation→sourceRef) を読む。 */
export function readSourceContent(spec: SpecFrontmatter): string | null {
  const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
  if (!path) return null
  const full = resolve(REPO_ROOT, path)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}
