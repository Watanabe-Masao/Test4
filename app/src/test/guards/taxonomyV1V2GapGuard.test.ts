/**
 * Taxonomy V1 ⇔ V2 Gap Guard — taxonomy-v2 子 Phase 6b
 *
 * 役割: v1/v2 並行運用期間中の「v1-only ファイル」「v2-only ファイル」「両方タグ」の
 * 件数を ratchet-down で管理する。Phase 7 v1 deprecation / Phase 8 retirement の前提として
 * 「v1-only file = 0 (Phase 7 までに移行完了)」「v2 coverage 100% (Phase 6a-2 で達成済)」
 * の状態を機械検証する。
 *
 * 検出する違反:
 *
 * - **GAP-R-1: v1-only tagged file（v1 vocabulary のみ、v2 vocabulary タグなし）**
 *   - scope = v1 TARGET_DIRS (5 dirs) — application/hooks / presentation/components /
 *     presentation/pages / presentation/hooks / features
 *   - baseline = Phase 6a-2 完了直後の実測値 (259 件、Phase 7 で 0 化目標)
 *   - 増加方向は hard fail、減少は baseline 更新（ratchet-down）
 *
 * - **GAP-R-2: v2-only tagged file（v2 vocabulary のみ、v1 vocabulary タグなし）**
 *   - scope = v1 TARGET_DIRS
 *   - 大半は Phase 6a-2 で付与した R:unclassified（後続 review window で具体タグへ promotion）
 *   - 情報出力のみ（hard fail なし）
 *
 * - **GAP-R-3: 両軸タグ co-existence file**
 *   - scope = v1 TARGET_DIRS
 *   - 移行過渡期の正常状態（v1 タグ + v2 タグの両方を持つ）
 *   - 情報出力のみ（hard fail なし）
 *
 * Phase 7 v1 Deprecation の前提条件: GAP-R-1 baseline = 0 到達 → 全 v1-only file が
 * v2 タグも併記された状態 → v1 retirement 時に意味情報が失われない。
 *
 * Phase 8 v1 Retirement の前提条件: GAP-R-1 baseline = 0 + 90 日 cooling 完了。
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see references/03-guides/responsibility-v1-to-v2-migration-map.md (Phase 2 deliverable)
 * @see app/src/test/guards/responsibilityTagGuard.test.ts (v1 guard)
 * @see app/src/test/guards/responsibilityTagGuardV2.test.ts (v2 guard)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { RESPONSIBILITY_TAGS_V2 } from '../responsibilityTaxonomyRegistryV2'

// ─── パス設定 ──────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const SRC_DIR = path.resolve(PROJECT_ROOT, 'app/src')

// v1 TARGET_DIRS (responsibilityTagGuard.test.ts と同期)
const V1_TARGET_DIRS = [
  'application/hooks',
  'presentation/components',
  'presentation/pages',
  'presentation/hooks',
  'features',
]

// v1 vocabulary (responsibilityTagRegistry.ts の type ResponsibilityTag と同期、v2 と重複する R:calculation / R:adapter を除く)
const V1_ONLY_VOCABULARY = new Set<string>([
  'R:query-plan',
  'R:query-exec',
  'R:data-fetch',
  'R:state-machine',
  'R:transform',
  'R:orchestration',
  'R:chart-view',
  'R:chart-option',
  'R:page',
  'R:widget',
  'R:form',
  'R:navigation',
  'R:persistence',
  'R:context',
  'R:layout',
  'R:utility',
  'R:reducer',
  'R:barrel',
  // R:calculation / R:adapter は v1/v2 共通名 (co-existence)
])

const V2_VOCABULARY: ReadonlySet<string> = new Set(RESPONSIBILITY_TAGS_V2)

// ─── ファイル収集 ─────────────────────────────────────

const isTargetFile = (file: string): boolean => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.includes('.test.')) return false
  if (file.includes('.stories.')) return false
  if (file.includes('.styles.')) return false
  if (file.includes('__tests__')) return false
  if (file.endsWith('/index.ts') || file.endsWith('/index.tsx')) return false
  return true
}

const collectV1ScopeFiles = (): string[] => {
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
      else if (isTargetFile(abs)) out.push(abs)
    }
  }
  for (const dir of V1_TARGET_DIRS) {
    walk(path.resolve(SRC_DIR, dir))
  }
  return out.sort()
}

// ─── tag reader ─────────────────────────────────────

const RESPONSIBILITY_REGEX = /@responsibility\s+(.+)/

interface FileGapInfo {
  readonly hasV1Only: boolean // v1 vocab を持ち、v2 vocab を持たない
  readonly hasV2Only: boolean // v2 vocab を持ち、v1 vocab を持たない
  readonly hasBoth: boolean // 両方の vocab を持つ
  readonly hasNone: boolean // どちらも持たない（タグなし含む）
}

const readGap = (absPath: string): FileGapInfo => {
  const content = fs.readFileSync(absPath, 'utf-8')
  const match = content.match(RESPONSIBILITY_REGEX)
  if (!match) {
    return { hasV1Only: false, hasV2Only: false, hasBoth: false, hasNone: true }
  }
  const tags = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const hasV1 = tags.some((t) => V1_ONLY_VOCABULARY.has(t))
  const hasV2 = tags.some((t) => V2_VOCABULARY.has(t))
  return {
    hasV1Only: hasV1 && !hasV2,
    hasV2Only: !hasV1 && hasV2,
    hasBoth: hasV1 && hasV2,
    hasNone: !hasV1 && !hasV2,
  }
}

const rel = (absPath: string): string => path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/')

// ─── ratchet-down baseline ──

/**
 * GAP-R-1: v1-only tagged file の baseline。
 *
 * Phase 6a-2 完了直後の実測値 = 259 件。これらは v1 vocabulary のみで分類済の file で、
 * Phase 7 v1 deprecation までに review window 経由で v2 タグへ migration が必要。
 * Phase 8 v1 retirement で 0 到達 → v1 vocabulary を物理削除。
 *
 * 減少方向のみ許可（ratchet-down）。減ったら本定数を更新する。
 */
const V1_ONLY_BASELINE = 259

// ─── tests ─────────────────────────────────────────

describe('Taxonomy V1 ⇔ V2 Gap Guard (taxonomy-v2 Phase 6b)', () => {
  const scopeFiles = collectV1ScopeFiles()

  it('GAP-R-0: v1 TARGET_DIRS scope 内に file が存在する (smoke test)', () => {
    expect(scopeFiles.length).toBeGreaterThan(100)
  })

  it('GAP-R-1: v1-only tagged file 数が baseline を超えない (ratchet-down)', () => {
    const v1Only: string[] = []
    for (const f of scopeFiles) {
      const info = readGap(f)
      if (info.hasV1Only) v1Only.push(rel(f))
    }
    const message =
      `v1-only tagged file 数: ${v1Only.length} (baseline: ${V1_ONLY_BASELINE})\n` +
      `これらは v1 vocabulary のみで分類済 file。Phase 7 v1 deprecation までに review window 経由で v2 タグ migration が必要。\n` +
      `減少方向のみ許可。減ったら本 file の V1_ONLY_BASELINE を ${v1Only.length} に更新してください。\n` +
      `詳細: references/03-guides/responsibility-v1-to-v2-migration-map.md §1 mapping table`
    expect(v1Only.length, message).toBeLessThanOrEqual(V1_ONLY_BASELINE)
  })

  it('GAP-R-2: v2-only tagged file の分布サマリ (情報出力)', () => {
    const v2Only: string[] = []
    for (const f of scopeFiles) {
      const info = readGap(f)
      if (info.hasV2Only) v2Only.push(rel(f))
    }
    // 情報出力のみ。Phase 6a-2 mass-tagging で大半が R:unclassified。
    // Phase 6c 以降の review window で具体タグへ promotion される。
    expect(v2Only.length).toBeGreaterThanOrEqual(0)
  })

  it('GAP-R-3: 両軸 co-existence + 分布全体サマリ (情報出力)', () => {
    let v1Only = 0
    let v2Only = 0
    let both = 0
    let none = 0
    for (const f of scopeFiles) {
      const info = readGap(f)
      if (info.hasV1Only) v1Only++
      else if (info.hasV2Only) v2Only++
      else if (info.hasBoth) both++
      else if (info.hasNone) none++
    }
    const total = scopeFiles.length
    process.stdout.write(
      `\n[GAP-R-3] v1 TARGET_DIRS 分布 (total=${total}):\n` +
        `  v1-only: ${v1Only} (${((v1Only / total) * 100).toFixed(1)}%)\n` +
        `  v2-only: ${v2Only} (${((v2Only / total) * 100).toFixed(1)}%)\n` +
        `  both:    ${both} (${((both / total) * 100).toFixed(1)}%)\n` +
        `  none:    ${none} (${((none / total) * 100).toFixed(1)}%)\n`,
    )
    // 全 file がいずれかの分類に属する（タグなし禁止は V2-R-3 で hard rule）
    expect(v1Only + v2Only + both + none).toBe(total)
  })
})
