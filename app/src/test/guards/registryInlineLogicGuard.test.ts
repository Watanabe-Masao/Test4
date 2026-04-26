/**
 * registryInlineLogicGuard —
 * widget registry 行の inline logic（IIFE / inline function declaration / palette refs）を
 * ratchet-down 管理
 *
 * projects/widget-registry-simplification SP-B ADR-B-003 PR1 で初期化（IIFE 検出）。
 * ADR-B-004 で inline function declaration / palette refs 検出を追加。
 *
 * 検出する違反:
 *  - I1: registry 行に IIFE pattern `(() => { ... })()` の出現数 ≤ baseline (ADR-B-003 fixed mode 0)
 *  - I2: registry file 内の top-level `function X(...)` 宣言数 ≤ baseline (ADR-B-004)
 *  - I3: registry / page-level widgets.tsx の render 関数内 `palette.X` 参照数 ≤ baseline (ADR-B-004)
 *
 * 設計意図:
 *   registry 行で `(() => { ... })()` IIFE / `function X(ctx) {}` inline helper /
 *   `accent={palette.X}` design token 直書きを書くと、
 *   - test しづらい（registry 行から logic を分離できない）
 *   - 同じ計算が複数 widget で再実装される
 *   - 型推論が registry に染み出して registry 行の責務が肥大化
 *   - design decision (色) が widget 登録層に漏れる
 *   ADR-B-003/B-004 で適切な抽出先（pure selector / domain calc / DS token）に移動する。
 *
 * Scope:
 *  - I1: app/src/presentation/pages/Dashboard/widgets/registry*.tsx
 *  - I2: I1 と同じ scope
 *  - I3: Dashboard registry*.tsx + page-level widgets.tsx (CostDetail / Category / Insight)
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-003 / §ADR-B-004
 *  - projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md §C-06 / §C-07 / §C-12
 *  - projects/widget-registry-simplification/plan.md §ADR-B-003 / §ADR-B-004
 *
 * @responsibility R:guard
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REGISTRY_DIR = path.join(PROJECT_ROOT, 'app/src/presentation/pages/Dashboard/widgets')
const PAGE_WIDGETS_FILES = [
  'app/src/presentation/pages/CostDetail/widgets.tsx',
  'app/src/presentation/pages/Category/widgets.tsx',
  'app/src/presentation/pages/Insight/widgets.tsx',
].map((rel) => path.join(PROJECT_ROOT, rel))

// I1: IIFE — fixed mode (baseline=0)
// - 初期 audit で registry*.tsx 配下の IIFE pattern `(() =>` を 3 件検出
// - ADR-B-003 PR2 で selector を application/readModels/customerFact/selectors.ts に新設
// - ADR-B-003 PR3 (commit 1356ff8) で 4 IIFE call site を selector call に置換
// - ADR-B-003 PR4 で baseline 3→0 fixed mode 移行。
// - LEG-009 sunsetCondition 達成（registry 内 inline pure helper の物理排除）
const BASELINE_IIFE_COUNT = 0

// I2: inline function declaration — ratchet-down (ADR-B-004)
// - 初期 audit で 1 件検出 (registryChartWidgets.tsx の buildPrevYearCostMap, WID-003)
// - PR2 で domain/calculations/prevYearCostApprox.ts に抽出
// - PR3 で registry 行を抽出先 call に置換
// - PR4 で baseline=0 fixed mode
const BASELINE_INLINE_FUNCTION_COUNT = 1

// I3: palette refs — ratchet-down (ADR-B-004)
// - 初期 audit で 4 件検出 (CostDetail/widgets.tsx WID-040 KpiCard accent 4 色)
// - PR2 で chart-semantic-colors token 経由 / costdetail-kpi-summary helper 抽出
// - PR3 で registry 行を helper call に置換
// - PR4 で baseline=0 fixed mode
const BASELINE_PALETTE_REF_COUNT = 4

const IIFE_PATTERN = /\(\(\)\s*=>/g
const INLINE_FUNCTION_PATTERN = /^function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/gm
const PALETTE_REF_PATTERN = /\bpalette\.[A-Za-z_][A-Za-z0-9_]*/g

/** registry*.tsx を全て列挙する */
function listRegistryFiles(): string[] {
  return readdirSync(REGISTRY_DIR)
    .filter((name) => /^registry.*\.tsx$/.test(name))
    .filter((name) => !name.endsWith('.test.tsx') && !name.endsWith('.stories.tsx'))
    .map((name) => path.join(REGISTRY_DIR, name))
}

/** page-level widgets.tsx (CostDetail / Category / Insight) を実在するもののみ列挙 */
function listPageWidgetFiles(): string[] {
  return PAGE_WIDGETS_FILES.filter((p) => existsSync(p))
}

function countByPattern(content: string, pattern: RegExp): number {
  const matches = content.match(pattern)
  return matches ? matches.length : 0
}

/** 全 registry file の合計 pattern 数を返す（per-file 内訳付き） */
function collectCounts(
  pattern: RegExp,
  files: string[],
): { totalCount: number; perFile: Map<string, number> } {
  const perFile = new Map<string, number>()
  let totalCount = 0
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const count = countByPattern(content, pattern)
    if (count > 0) {
      const rel = path.relative(PROJECT_ROOT, file)
      perFile.set(rel, count)
      totalCount += count
    }
  }
  return { totalCount, perFile }
}

describe('registryInlineLogicGuard (SP-B ADR-B-003 + ADR-B-004)', () => {
  it('I1: registry 行の IIFE 数が baseline を超えない（fixed mode）', () => {
    const { totalCount, perFile } = collectCounts(IIFE_PATTERN, listRegistryFiles())
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `IIFE pattern 数 = ${totalCount} (baseline = ${BASELINE_IIFE_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: fixed mode (baseline=0) 到達済み。新規 IIFE は registry に書かず、' +
      'application/readModels/<source>/selectors.ts に pure selector として抽出する。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-003'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_IIFE_COUNT)
  })

  it('I2: registry file 内の top-level function 宣言数が baseline を超えない（ratchet-down）', () => {
    const { totalCount, perFile } = collectCounts(INLINE_FUNCTION_PATTERN, listRegistryFiles())
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `inline function 宣言数 = ${totalCount} (baseline = ${BASELINE_INLINE_FUNCTION_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: registry file 内の `function X(ctx)` 宣言は domain/calculations や ' +
      'application/readModels/<source>/ に pure function として抽出する。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-004'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_INLINE_FUNCTION_COUNT)
  })

  it('I3: registry / page-widgets.tsx の palette.X 参照数が baseline を超えない（ratchet-down）', () => {
    const files = [...listRegistryFiles(), ...listPageWidgetFiles()]
    const { totalCount, perFile } = collectCounts(PALETTE_REF_PATTERN, files)
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `palette.X 参照数 = ${totalCount} (baseline = ${BASELINE_PALETTE_REF_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: widget registry に palette token を直書きすると design decision が登録層に漏れる。' +
      'chart-semantic-colors / accent token を介して helper component に閉じ込める。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-004'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_PALETTE_REF_COUNT)
  })

  it('listRegistryFiles は registry*.tsx のみを返す（test / stories 除外）', () => {
    const files = listRegistryFiles()
    for (const file of files) {
      const base = path.basename(file)
      expect(/^registry.*\.tsx$/.test(base)).toBe(true)
      expect(base.endsWith('.test.tsx')).toBe(false)
      expect(base.endsWith('.stories.tsx')).toBe(false)
    }
    // 少なくとも 1 つ以上の registry file が存在することを保証
    expect(files.length).toBeGreaterThan(0)
  })
})
