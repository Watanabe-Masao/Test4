/**
 * shortcutPatternGuard —
 * Dashboard widget registry の二重 null check pattern を ratchet-down 管理
 *
 * projects/widget-registry-simplification SP-B ADR-B-001 PR1。
 *
 * 検出する違反:
 *  - S1: registry の `isVisible: (ctx) => ctx.X?.` のような optional chaining gate
 *        の出現数 ≤ baseline
 *
 * 設計意図:
 *   `isVisible: (ctx) => ctx.queryExecutor?.isReady === true` のような optional
 *   chaining による null gate は、子 component 側でも null check が必要になる
 *   「二重 null check pattern」の起点となる。SP-A 完了で DashboardWidgetContext
 *   の required field が確定したため、ADR-B-001 で type narrowing を活用して
 *   gate を不要化できる widget から順次解消する。
 *
 * Scope:
 *  - app/src/presentation/pages/Dashboard/widgets/registry*.tsx のみ
 *  - 他の Page (Insight / CostDetail / Category) の registry は対象外
 *    （page-specific WidgetContext で既に required 化済み）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-001
 *  - projects/architecture-debt-recovery/inquiry/04-type-asymmetry.md §D
 *  - projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md §C-01
 *  - projects/widget-registry-simplification/plan.md §ADR-B-001
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import { readFileSync, readdirSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REGISTRY_DIR = path.join(PROJECT_ROOT, 'app/src/presentation/pages/Dashboard/widgets')

// fixed mode (baseline=0)
// - 初期 audit で `isVisible:.*ctx\) => ctx\.[name]?\.` pattern を 6 件検出
//   (registryAnalysisWidgets x1 + registryDuckDBWidgets x5、全て queryExecutor?.isReady)
// - ADR-B-001 PR2 (commit bf426b5) で registryDuckDBWidgets.tsx 5 件を
//   `.isReady` に置換（DashboardWidgetContext.queryExecutor が QueryExecutor 型 required の
//    type narrowing を活用）
// - ADR-B-001 PR3 (commit 0004352) で registryAnalysisWidgets.tsx 残 1 件を置換
// - ADR-B-001 PR4 (本 commit) で baseline=0 fixed mode 移行。
//   新規 isVisible は ctx.X?. ではなく ctx.X.field を直接書く運用に固定
const BASELINE_SHORTCUT_COUNT = 0

// `isVisible: (ctx) => ctx.X?.` pattern を検出
// 例:
//   isVisible: (ctx) => ctx.queryExecutor?.isReady === true
//   isVisible: (ctx) => ctx.queryExecutor?.isReady === true && ctx.loadedMonthCount >= 2
const SHORTCUT_PATTERN = /isVisible:\s*\(\s*ctx\s*\)\s*=>\s*ctx\.[A-Za-z][A-Za-z0-9_]*\?\./g

/** registry*.tsx を全て列挙する */
function listRegistryFiles(): string[] {
  return readdirSync(REGISTRY_DIR)
    .filter((name) => /^registry.*\.tsx$/.test(name))
    .filter((name) => !name.endsWith('.test.tsx') && !name.endsWith('.stories.tsx'))
    .map((name) => path.join(REGISTRY_DIR, name))
}

function countShortcutInContent(content: string): number {
  const matches = content.match(SHORTCUT_PATTERN)
  return matches ? matches.length : 0
}

function collectShortcutCounts(): { totalCount: number; perFile: Map<string, number> } {
  const files = listRegistryFiles()
  const perFile = new Map<string, number>()
  let totalCount = 0
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const count = countShortcutInContent(content)
    if (count > 0) {
      const rel = path.relative(PROJECT_ROOT, file)
      perFile.set(rel, count)
      totalCount += count
    }
  }
  return { totalCount, perFile }
}

describe('shortcutPatternGuard (SP-B ADR-B-001)', () => {
  it('S1: registry の二重 null check shortcut 数が baseline を超えない（ratchet-down）', () => {
    const { totalCount, perFile } = collectShortcutCounts()
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `shortcut pattern (isVisible 内の optional chaining gate) 数 = ${totalCount} ` +
      `(baseline = ${BASELINE_SHORTCUT_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: fixed mode (baseline=0) 到達済み。新規 isVisible は ctx.X?. ではなく ' +
      'ctx.X.field を直接書く運用に固定。DashboardWidgetContext で required な field のみを参照する。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-001'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_SHORTCUT_COUNT)
  })

  it('SHORTCUT_PATTERN は isVisible 内の optional chaining gate を正しく検出する', () => {
    const sample1 = 'isVisible: (ctx) => ctx.queryExecutor?.isReady === true'
    const sample2 =
      'isVisible: (ctx) => ctx.queryExecutor?.isReady === true && ctx.loadedMonthCount >= 2'
    const sampleNoGate = 'isVisible: (ctx) => ctx.allStoreResults.size > 0'
    const sampleNotIsVisible = 'render: (ctx) => ctx.queryExecutor?.isReady === true'

    expect(sample1.match(SHORTCUT_PATTERN)?.length).toBe(1)
    expect(sample2.match(SHORTCUT_PATTERN)?.length).toBe(1)
    expect(sampleNoGate.match(SHORTCUT_PATTERN)).toBeNull()
    expect(sampleNotIsVisible.match(SHORTCUT_PATTERN)).toBeNull()
  })
})
