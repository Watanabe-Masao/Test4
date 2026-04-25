/**
 * Orphan UI Component Guard
 *
 * `presentation/pages/<page>/widgets/` と `features/<slice>/ui/` 配下で
 * **本番到達不能な .tsx component**（orphan）を検出する。
 *
 * 検出する違反:
 *
 * - **O1**: 登録された orphan（ALLOWLIST 内）は Phase 6 で
 *   ADR-C-003 により削除予定。削除されていない状態を検出して
 *   ratchet-down baseline で管理
 * - **O2**: ALLOWLIST 外の新しい orphan 発生禁止（今後の新規 orphan を防ぐ）
 *
 * 「orphan」の定義:
 *   - `.tsx` ファイル
 *   - test 以外から import されていない（`.test.tsx` / `.stories.tsx` / `__tests__/` は除外）
 *   - basename で grep して self 以外の import 行 0 件
 *
 * 本 guard は architecture-debt-recovery Lane C の SP-C sub-project の
 * ADR-C-003 に対応する。Phase 6 で 3 file 削除 → baseline 0 fixed mode。
 *
 * @see projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-C-003
 * @see projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-5
 * @see projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-014
 * @see projects/architecture-debt-recovery/inquiry/03-ui-component-orphans.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

// ratchet-down baseline
// - inquiry/03 §Tier D で 3 件が確定していたが、本 guard の実測で 7 件を検出
// - 追加 4 件（Condition*.tsx / ExecSummaryBarWidget.tsx）は inquiry/03 の Explore agent が見落とし
// - PR1 時点 baseline=7、ADR-C-003 PR2 (2026-04-24) で LEG-014 scope 3 件を削除し baseline=4 に減算
// - PR3 で残 4 件の処理方針（scope 追加 or 保留）を決定、最終的に baseline=0 固定
const BASELINE = 4

// baseline を構成する既知 orphan。
// - LEG-014 scope 3 件 (DowGapKpiCard / PlanActualForecast / RangeComparison) は
//   ADR-C-003 PR2 で削除済み。
// - 残 4 件は `17a-*.md` addendum 承認待ちで保留中（ADR-C-003 scope 外）。
const KNOWN_ORPHAN_ALLOWLIST: readonly string[] = [
  // 本 guard 実測で追加検出（inquiry/03 の agent 見落とし。scope 拡張は `17a-*.md` 承認待ち）
  'app/src/presentation/pages/Dashboard/widgets/ConditionDetailPanels.tsx',
  'app/src/presentation/pages/Dashboard/widgets/ConditionMatrixTable.tsx',
  'app/src/presentation/pages/Dashboard/widgets/ConditionSummary.tsx',
  'app/src/presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx',
]

// 走査対象ディレクトリ
const SCAN_ROOTS = [
  'app/src/presentation/pages', // pages/*/widgets/ 配下
  'app/src/features', // features/*/ui/ 配下
]

/** .tsx ファイル一覧（test / stories 除外） */
function listCandidateTsxFiles(): string[] {
  const out: string[] = []
  for (const root of SCAN_ROOTS) {
    const absRoot = path.join(PROJECT_ROOT, root)
    if (!fs.existsSync(absRoot)) continue
    walk(absRoot, out)
  }
  return out.map((p) => path.relative(PROJECT_ROOT, p))
}

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue
      walk(full, out)
      continue
    }
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.tsx')) continue
    if (entry.name.endsWith('.test.tsx')) continue
    if (entry.name.endsWith('.stories.tsx')) continue
    // pages/*/widgets/ または features/*/ui/ 配下に限定
    const relativeFromSrc = path.relative(APP_SRC, full)
    if (!isInScope(relativeFromSrc)) continue
    out.push(full)
  }
}

function isInScope(relPath: string): boolean {
  // presentation/pages/<Page>/widgets/... または features/<slice>/ui/...
  if (/^presentation\/pages\/[^/]+\/widgets(\/|$)/.test(relPath)) return true
  if (/^features\/[^/]+\/ui(\/|$)/.test(relPath)) return true
  return false
}

/** 全 .ts / .tsx 本番ソースを 1 回だけ走査して結合したテキスト */
let cachedSourceBlob: string | null = null
function getProductionSourceBlob(): string {
  if (cachedSourceBlob !== null) return cachedSourceBlob
  const parts: string[] = []
  walkForImportsCollect(path.join(PROJECT_ROOT, 'app/src'), parts)
  cachedSourceBlob = parts.join('\n')
  return cachedSourceBlob
}

function walkForImportsCollect(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue
      walkForImportsCollect(full, out)
      continue
    }
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
    if (
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.test.tsx') ||
      entry.name.endsWith('.stories.tsx')
    ) {
      continue
    }
    out.push(fs.readFileSync(full, 'utf-8'))
  }
}

/** ファイル basename が source blob 内に import 表記で出現するか */
function hasNonSelfNonTestImport(relFilePath: string, blob: string, selfContent: string): boolean {
  const base = path.basename(relFilePath, '.tsx')
  // self の content を blob から除外しなければならないため、selfContent を引く
  // ただし blob 全体に対して一括検索する方が速いので、まず blob に出現するか確認
  // → 出現した後、その出現が self 由来のみかどうかをチェック
  const patterns = [`/${base}'`, `/${base}"`, `'./${base}'`, `"./${base}"`]
  for (const p of patterns) {
    if (!blob.includes(p)) continue
    // blob 内に出現した場合、self の content だけで説明されないかを確認
    const inBlobCount = countOccurrences(blob, p)
    const inSelfCount = countOccurrences(selfContent, p)
    if (inBlobCount > inSelfCount) return true
  }
  return false
}

function countOccurrences(str: string, needle: string): number {
  if (needle.length === 0) return 0
  let count = 0
  let idx = 0
  while ((idx = str.indexOf(needle, idx)) !== -1) {
    count += 1
    idx += needle.length
  }
  return count
}

/** scope 内の orphan 候補を列挙 */
function findOrphans(): string[] {
  const candidates = listCandidateTsxFiles()
  const blob = getProductionSourceBlob()
  return candidates.filter((rel) => {
    const full = path.join(PROJECT_ROOT, rel)
    const selfContent = fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : ''
    return !hasNonSelfNonTestImport(rel, blob, selfContent)
  })
}

describe('Orphan UI Component Guard: presentation/pages/*/widgets/ + features/*/ui/ の orphan 検出', () => {
  it('orphan 数が baseline を超えない（O1 / O2 ratchet-down）', () => {
    const orphans = findOrphans()
    const message =
      `orphan 件数 = ${orphans.length} (baseline = ${BASELINE}):\n` +
      orphans.map((o) => `  - ${o}`).join('\n') +
      '\n\n' +
      'hint: ADR-C-003 PR2 で 3 件削除後、baseline=0 + ALLOWLIST 空 で固定モード化する。' +
      '\n  新規 orphan 発生時は UI component を削除するか、allowlist に追加して理由を明記する。' +
      '\n  詳細: projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-014'
    expect(orphans.length, message).toBeLessThanOrEqual(BASELINE)
  })

  it('baseline を構成する orphan が ALLOWLIST と一致する（削除忘れ検出）', () => {
    const orphans = findOrphans().sort()
    const allowlist = [...KNOWN_ORPHAN_ALLOWLIST].sort()

    // orphan 数が baseline 未満の場合、ALLOWLIST は一部削除済みなので allowlist 要素が
    // 実 orphan より多いのは問題（allowlist の方を縮退するよう促す）
    const unexpectedInAllowlist = allowlist.filter((a) => !orphans.includes(a))
    const message =
      unexpectedInAllowlist.length > 0
        ? `ALLOWLIST にあるが実際には orphan でない（削除済み or 復活済み）:\n` +
          unexpectedInAllowlist.map((u) => `  - ${u}`).join('\n') +
          '\n\nhint: ALLOWLIST から削除して baseline を縮退してください。'
        : ''
    expect(unexpectedInAllowlist, message).toEqual([])
  })

  it('listCandidateTsxFiles は scope 外ファイルを除外する', () => {
    const candidates = listCandidateTsxFiles()
    for (const c of candidates) {
      expect(c.endsWith('.test.tsx')).toBe(false)
      expect(c.endsWith('.stories.tsx')).toBe(false)
      expect(c.includes('__tests__/')).toBe(false)
      // scope 内のみ
      const inScope =
        /^app\/src\/presentation\/pages\/[^/]+\/widgets(\/|$)/.test(c) ||
        /^app\/src\/features\/[^/]+\/ui(\/|$)/.test(c)
      expect(inScope, `out of scope: ${c}`).toBe(true)
    }
  })

  it('isInScope は pages/<Page>/widgets/ と features/<slice>/ui/ のみを許可する', () => {
    expect(isInScope('presentation/pages/Dashboard/widgets/Foo.tsx')).toBe(true)
    expect(isInScope('presentation/pages/Category/widgets/Sub/Bar.tsx')).toBe(true)
    expect(isInScope('features/budget/ui/BudgetWidget.tsx')).toBe(true)
    expect(isInScope('features/category/ui/charts/CategoryChart.tsx')).toBe(true)
    expect(isInScope('presentation/components/charts/Chart.tsx')).toBe(false)
    expect(isInScope('presentation/pages/Dashboard/DashboardPage.tsx')).toBe(false)
    expect(isInScope('application/hooks/useFoo.ts')).toBe(false)
  })
})
