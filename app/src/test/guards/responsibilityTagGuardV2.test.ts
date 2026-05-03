/**
 * Responsibility Tag Guard V2 — taxonomy-v2 子 Phase 3 (Guard 実装)
 *
 * 役割: v2 R:tag vocabulary（10 件）に対する **untagged ratchet-down** + **unknown
 * vocabulary 検出** + **R:unclassified 区別** を hard fail で機械検証する。
 *
 * v1 guard (`responsibilityTagGuard.test.ts`) と **並行運用** する:
 * - v1: TARGET_DIRS 5 件（application/hooks / presentation/* / features/）+ v1 vocabulary 20 件
 * - v2: scope 拡大（application + domain + features + infrastructure + presentation + test/guards）+
 *   v2 vocabulary 10 件（responsibilityTaxonomyRegistryV2.ts）
 *
 * 検出する違反 (本 Phase 3 deliverable):
 *
 * - **V2-R-1: タグなし違反**（ratchet-down baseline）
 *   - scope 内の production file が `@responsibility` を持たない
 *   - baseline = Phase 0 inventory 計測値（untagged 1055）
 *   - 増加方向は hard fail、減少は baseline 更新
 *
 * - **V2-R-2: unknown vocabulary 違反**（ratchet-down baseline）
 *   - file が `@responsibility` で v2 vocabulary に存在しない tag を持つ
 *   - baseline = Phase 0 inventory 計測値（unknownVocabulary 20）
 *   - v1 vocabulary は **v2 では unknown** として検出（Phase 6 Migration Rollout で v2 に置換）
 *
 * - **V2-R-3: R:unclassified の能動明示** (sentinel hard rule)
 *   - file がタグなし状態で残ることは禁止（原則 1: 未分類は能動タグ、タグなしは禁止）
 *   - **本 Phase 3 では未活性化**（Phase 6 Migration Rollout 完了後に activate）
 *
 * Anchor Slice §OCS.5 Promotion Gate L4 (Guarded) 到達条件:
 * - 本 guard が PASS している
 * - taxonomy-health.json に v2 metrics が出力されている（統合 branch + Phase 4）
 * - AR-TAXONOMY-* rules が architectureRules.ts に登録されている（統合 branch）
 *
 * @responsibility R:guard
 * @see references/01-foundation/responsibility-taxonomy-schema.md
 * @see references/01-foundation/responsibility-v1-to-v2-migration-map.md (Phase 2 deliverable)
 * @see references/04-tracking/responsibility-taxonomy-inventory.yaml (Phase 0 baseline)
 * @see app/src/test/responsibilityTaxonomyRegistryV2.ts (v2 registry)
 * @see app/src/test/guards/responsibilityTagGuard.test.ts (v1 guard, 並行運用)
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { RESPONSIBILITY_TAGS_V2, isResponsibilityTagV2 } from '../responsibilityTaxonomyRegistryV2'

// ─── パス設定 ──────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const SRC_DIR = path.resolve(PROJECT_ROOT, 'app/src')

// ─── scope: scan 対象（v2 inventory generator と同じ）──

const SCOPE_DIRS: readonly string[] = [
  'application',
  'domain',
  'features',
  'infrastructure',
  'presentation',
  'test',
]

const isProductionFile = (file: string): boolean => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.includes('.test.')) return false
  if (file.includes('.stories.')) return false
  if (file.includes('.styles.')) return false
  if (file.includes('__tests__')) return false
  if (file.includes('.d.ts')) return false
  return true
}

const isGuardFile = (file: string): boolean =>
  file.includes('/test/guards/') && file.endsWith('.test.ts')

const collectFiles = (absDir: string, predicate: (f: string) => boolean): string[] => {
  const out: string[] = []
  const walk = (dir: string): void => {
    let entries: string[]
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return
    }
    for (const e of entries) {
      const abs = path.join(dir, e)
      let st
      try {
        st = fs.statSync(abs)
      } catch {
        continue
      }
      if (st.isDirectory()) walk(abs)
      else if (predicate(abs)) out.push(abs)
    }
  }
  walk(absDir)
  return out.sort()
}

// ─── tag reader ─────────────────────────────────────

const RESPONSIBILITY_REGEX = /@responsibility\s+(.+)/

interface FileTagInfo {
  readonly tags: readonly string[] | null
  readonly raw: string | null
}

const readTags = (absPath: string): FileTagInfo => {
  let content: string
  try {
    content = fs.readFileSync(absPath, 'utf-8')
  } catch {
    return { tags: null, raw: null }
  }
  const match = content.match(RESPONSIBILITY_REGEX)
  if (!match) return { tags: null, raw: null }
  const raw = match[1].trim()
  const tags = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { tags, raw }
}

const collectScopeFiles = (): string[] => {
  const all: string[] = []
  for (const dir of SCOPE_DIRS) {
    const abs = path.resolve(SRC_DIR, dir)
    if (dir === 'test') {
      all.push(...collectFiles(abs, isGuardFile))
    } else {
      all.push(...collectFiles(abs, isProductionFile))
    }
  }
  return all.sort()
}

const rel = (absPath: string): string => path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/')

// ─── ratchet-down baseline (Phase 0 inventory 計測値) ──

/**
 * v2 untagged baseline (Phase 0 inventory: untagged 1055 → Phase 4 Pilot で 1043 に ratchet-down)
 *
 * 減少方向のみ許可（ratchet-down）。減ったら本定数を更新する。
 * Phase 6 Migration Rollout で全 file に v2 R:tag (R:unclassified 含む) が付与され、
 * Phase 6 完了時に baseline = 0 到達 → Phase 6 完了後に固定モード化（V2-R-3 activate）。
 *
 * Phase 4 Pilot 注: v1 guard の TARGET_DIRS 内（application/hooks / presentation/components）の
 * file は v2 単独タグだと v1 guard が拒否するため Pilot 対象外（Phase 6 Migration Rollout で
 * v1 → v2 一斉移行を v1 guard retirement と同時に実施）。Pilot で減算したのは
 * v1 TARGET_DIRS 外の 12 file (1055 → 1043 = -12)。
 */
const UNTAGGED_BASELINE_V2 = 0

/**
 * v2 unknown vocabulary baseline (Phase 3 実測値: 270 → Phase 4 Pilot 一時 268 → conflict revert で 270 維持)
 *
 * v1 vocabulary（R:chart-view / R:widget / R:utility / R:transform 等の 18 件）は
 * v2 vocabulary にないため **unknown として検出**される。Phase 4 Pilot で v1 → v2 置換 3 件は
 * v1 guard との conflict （v1 TARGET_DIRS 内 file）で revert したため、本 baseline は維持。
 * 純粋な v2 置換は migrationTagRegistry 1 件のみで baseline 269 (-1) も可能だが、
 * conservative に 270 を維持し Phase 6 Migration Rollout 一括変換時に下げる。
 *
 * 減少方向のみ許可（ratchet-down）。Phase 6 で v1 → v2 一括変換し baseline = 0 到達 →
 * Phase 8 で v1 guard retirement。
 */
const UNKNOWN_VOCABULARY_BASELINE_V2 = 0

// ─── tests ─────────────────────────────────────────

describe('Responsibility Tag Guard V2 (taxonomy-v2 Phase 3)', () => {
  const scopeFiles = collectScopeFiles()

  it('V2-R-0: scope 内に scan 対象 file が存在する (smoke test)', () => {
    expect(scopeFiles.length).toBeGreaterThan(100)
  })

  it('V2-R-1: untagged file 数が baseline を超えない (ratchet-down)', () => {
    const untagged: string[] = []
    for (const file of scopeFiles) {
      const info = readTags(file)
      if (info.tags === null) untagged.push(rel(file))
    }
    const message =
      `v2 untagged file 数: ${untagged.length} (baseline: ${UNTAGGED_BASELINE_V2})\n` +
      `減少方向のみ許可。減ったら本 file の UNTAGGED_BASELINE_V2 を ${untagged.length} に更新してください。\n` +
      `Phase 6 Migration Rollout で v2 R:tag (R:unclassified 含む) を付与して baseline = 0 を目指す。\n` +
      `詳細: references/03-implementation/responsibility-v1-to-v2-migration-map.md §2 退避方針`
    expect(untagged.length, message).toBeLessThanOrEqual(UNTAGGED_BASELINE_V2)
  })

  it('V2-R-2: unknown vocabulary 使用 file 数が baseline を超えない (ratchet-down)', () => {
    // unknown = file が R:* タグを持つが v2 vocabulary に存在しない
    const unknownVocab: string[] = []
    for (const file of scopeFiles) {
      const info = readTags(file)
      if (info.tags === null) continue
      const hasUnknown = info.tags.some((t) => t.startsWith('R:') && !isResponsibilityTagV2(t))
      if (hasUnknown) unknownVocab.push(rel(file))
    }
    const message =
      `v2 unknown vocabulary 使用 file 数: ${unknownVocab.length} (baseline: ${UNKNOWN_VOCABULARY_BASELINE_V2})\n` +
      `v1 vocabulary は v2 では unknown として検出される（v1 guard と並行運用、Phase 8 で v1 retirement）。\n` +
      `減少方向のみ許可。Phase 6 Migration Rollout で v1 → v2 一括変換し baseline = 0 を目指す。\n` +
      `詳細: references/03-implementation/responsibility-v1-to-v2-migration-map.md §1 mapping table`
    expect(unknownVocab.length, message).toBeLessThanOrEqual(UNKNOWN_VOCABULARY_BASELINE_V2)
  })

  it('V2-R-3: タグなし vs R:unclassified の区別を hard fail にする (Phase 6a-2 完了で activate)', () => {
    // Phase 6a-2 (mass tagging) で全 file に v2 R:tag (R:unclassified 含む) が付与され、
    // V2-R-1 baseline = 0 到達。本 V2-R-3 は hard rule として活性化:
    //   - 全 scope file は @responsibility R:* を必ず持つ（タグなし禁止）
    //   - R:unclassified は能動タグ（Constitution 原則 1: 未分類は能動タグ）
    // 違反 = file がタグなし状態 → hard fail。
    const untagged: string[] = []
    for (const file of scopeFiles) {
      const info = readTags(file)
      if (info.tags === null) untagged.push(rel(file))
    }
    expect(
      untagged,
      `タグなし file が検出されました（hard fail）。Phase 6a-2 以降は @responsibility 必須:\n${untagged.slice(0, 10).join('\n')}`,
    ).toEqual([])
  })

  it('V2-R-4: v2 vocabulary が Cognitive Load Ceiling 15 以下 (原則 7)', () => {
    expect(RESPONSIBILITY_TAGS_V2.length).toBeLessThanOrEqual(15)
  })
})
