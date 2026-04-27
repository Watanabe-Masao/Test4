/**
 * Test Taxonomy Guard V2 — taxonomy-v2 子 Phase 3 (Guard 実装)
 *
 * 役割: v2 T:kind vocabulary（15 件 = primary 11 + optional 4）に対する **untagged
 * ratchet-down** + **unknown vocabulary 検出** + **T:unclassified 区別** を hard fail で
 * 機械検証する。
 *
 * v1 TSIG global rule (`testSignalIntegrityGuard.test.ts`) と **並行運用** する:
 * - v1 TSIG: global（全 728 test 一律）の existence-only / tautology assertion 検証
 * - v2 T:kind: per-test obligation（R:tag → 必須 T:kind interlock 経由）
 *
 * 検出する違反 (本 Phase 3 deliverable):
 *
 * - **V2-T-1: untagged 違反**（ratchet-down baseline）
 *   - test file が `@taxonomyKind T:*` を持たない
 *   - baseline = Phase 0 inventory 計測値（untagged 728 = 全 test、v2 は v2-only）
 *   - 増加方向は hard fail、減少は baseline 更新
 *
 * - **V2-T-2: unknown vocabulary 違反**（ratchet-down baseline）
 *   - file が registry 未登録の T:kind を持つ場合に検出
 *   - baseline = 0（Phase 3 時点で v2 T:kind 使用 test は 0、新規追加は registry 経由のみ）
 *
 * - **V2-T-3: T:unclassified の能動明示** (sentinel hard rule)
 *   - test がタグなし状態で残ることは禁止（原則 1: 未分類は能動タグ、タグなしは禁止）
 *   - **本 Phase 3 では未活性化**（Phase 6 Migration Rollout 完了後に activate）
 *
 * Anchor Slice §OCS.5 Promotion Gate L4 (Guarded) 到達条件:
 * - 本 guard が PASS している
 * - taxonomy-health.json に v2 metrics が出力されている（統合 branch + Phase 4）
 * - AR-TAXONOMY-* rules が architectureRules.ts に登録されている（統合 branch）
 *
 * @responsibility R:guard
 * @see references/01-principles/test-taxonomy-schema.md
 * @see references/03-guides/test-tsig-to-v2-migration-map.md (Phase 2 deliverable)
 * @see references/02-status/test-taxonomy-inventory.yaml (Phase 0 baseline)
 * @see app/src/test/testTaxonomyRegistryV2.ts (v2 registry)
 * @see app/src/test/guards/testSignalIntegrityGuard.test.ts (v1 TSIG, 並行運用)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  TEST_TAXONOMY_KINDS_V2,
  isTestTaxonomyKindV2,
  filterByTier,
} from '../testTaxonomyRegistryV2'

// ─── パス設定 ──────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const SRC_DIR = path.resolve(PROJECT_ROOT, 'app/src')

// ─── scope: 全 *.test.ts / *.test.tsx (v2 inventory generator と同じ)──

const isTestFile = (file: string): boolean => {
  if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) return false
  return true
}

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

// 識別子 pattern: T:[a-z][a-z0-9-]+ のみ match（JSDoc 内の `T:*` / `T:foo` 等の placeholder を除外）
const TAXONOMY_KIND_REGEX = /@taxonomyKind\s+(T:[a-z][a-z0-9-]+(?:\s*,\s*T:[a-z][a-z0-9-]+)*)/

interface FileTagInfo {
  readonly kinds: readonly string[] | null
  readonly raw: string | null
}

const readKinds = (absPath: string): FileTagInfo => {
  let content: string
  try {
    content = fs.readFileSync(absPath, 'utf-8')
  } catch {
    return { kinds: null, raw: null }
  }
  const match = content.match(TAXONOMY_KIND_REGEX)
  if (!match) return { kinds: null, raw: null }
  const raw = match[1].trim()
  const kinds = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { kinds, raw }
}

const collectTestFiles = (): string[] => collectFiles(SRC_DIR, isTestFile)

const rel = (absPath: string): string => path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/')

// ─── ratchet-down baseline (Phase 0 inventory 計測値) ──

/**
 * v2 untagged baseline (Phase 0 inventory: 全 728 test が untagged → Phase 4 Pilot で 709 に ratchet-down)
 *
 * v2 T:kind は v2-only vocabulary。Phase 1 で landing したばかりで、Phase 3 時点では
 * 全 test が untagged。Phase 4 Pilot で 22 件 (Anchor 6 T:kind + optional 4) を試験付与し
 * 19 件減少 (一部 v2 R:tag 既付与 file との重複)。Phase 6 Migration Rollout で全 test に
 * T:kind (T:unclassified 含む) を付与し、baseline = 0 到達 → Phase 6 完了後に固定モード化。
 */
const UNTAGGED_BASELINE_V2 = 709

/**
 * v2 unknown vocabulary baseline (0)
 *
 * Phase 3 時点で v2 T:kind 使用 test は 0。新規追加は registry 経由のみ（registry V2 に
 * ない T:kind を test に付与した場合は本 V2-T-2 で検出される）。Phase 6 Migration
 * Rollout でも全て v2 vocabulary 経由で付与されるため、baseline = 0 を維持する。
 */
const UNKNOWN_VOCABULARY_BASELINE_V2 = 0

// ─── tests ─────────────────────────────────────────

describe('Test Taxonomy Guard V2 (taxonomy-v2 Phase 3)', () => {
  const testFiles = collectTestFiles()

  it('V2-T-0: scope 内に test file が存在する (smoke test)', () => {
    expect(testFiles.length).toBeGreaterThan(500)
  })

  it('V2-T-1: untagged test 数が baseline を超えない (ratchet-down)', () => {
    const untagged: string[] = []
    for (const file of testFiles) {
      const info = readKinds(file)
      if (info.kinds === null) untagged.push(rel(file))
    }
    const message =
      `v2 untagged test 数: ${untagged.length} (baseline: ${UNTAGGED_BASELINE_V2})\n` +
      `減少方向のみ許可。減ったら本 file の UNTAGGED_BASELINE_V2 を ${untagged.length} に更新してください。\n` +
      `Phase 6 Migration Rollout で v2 T:kind (T:unclassified 含む) を付与して baseline = 0 を目指す。\n` +
      `詳細: references/03-guides/test-tsig-to-v2-migration-map.md §2 退避方針`
    expect(untagged.length, message).toBeLessThanOrEqual(UNTAGGED_BASELINE_V2)
  })

  it('V2-T-2: unknown vocabulary 使用 test 数が baseline を超えない (baseline=0、registry 強制)', () => {
    const unknownVocab: string[] = []
    for (const file of testFiles) {
      const info = readKinds(file)
      if (info.kinds === null) continue
      const hasUnknown = info.kinds.some((t) => t.startsWith('T:') && !isTestTaxonomyKindV2(t))
      if (hasUnknown) unknownVocab.push(rel(file))
    }
    const message =
      `v2 unknown vocabulary 使用 test 数: ${unknownVocab.length} (baseline: ${UNKNOWN_VOCABULARY_BASELINE_V2})\n` +
      `新 T:kind 追加は **review window 経由のみ**（原則 3）+ 既存 retirement とセット必須（Cognitive Load Ceiling 15 cap）。\n` +
      `詳細: references/01-principles/test-taxonomy-schema.md §6 改訂手続き`
    expect(unknownVocab.length, message).toBeLessThanOrEqual(UNKNOWN_VOCABULARY_BASELINE_V2)
  })

  it('V2-T-3: タグなし vs T:unclassified の区別を hard fail にする (Phase 6 完了後に activate、Phase 3 では skip)', () => {
    expect(TEST_TAXONOMY_KINDS_V2).toContain('T:unclassified')
    expect(isTestTaxonomyKindV2('T:unclassified')).toBe(true)
  })

  it('V2-T-4: v2 vocabulary が Cognitive Load Ceiling 15 cap (原則 7)', () => {
    expect(TEST_TAXONOMY_KINDS_V2.length).toBeLessThanOrEqual(15)
  })

  it('V2-T-5: tier 構造 — primary 11 + optional 4 = 15', () => {
    const primary = filterByTier('primary')
    const optional = filterByTier('optional')
    expect(primary.length).toBe(11)
    expect(optional.length).toBe(4)
    expect(primary.length + optional.length).toBe(TEST_TAXONOMY_KINDS_V2.length)
  })
})
