/**
 * fullCtxPassthroughGuard —
 * Dashboard widget registry の full ctx passthrough（`<X ctx={ctx} />` /
 * `<X widgetCtx={ctx} />`）を ratchet-down 管理
 *
 * projects/widget-registry-simplification SP-B ADR-B-002 PR1。
 *
 * 検出する違反:
 *  - F1: registry*.tsx 配下の full ctx passthrough 出現数 ≤ baseline
 *
 * 設計意図:
 *   `<X ctx={ctx} />` / `<X widgetCtx={ctx} />` のように widget context 全体を
 *   子 component に渡すと:
 *   - 子の依存範囲が型から見えない（実際は ctx の一部しか使わない場合でも全体に依存）
 *   - widget の責務境界が曖昧化（registry 側の change が子に波及）
 *   - test 時に巨大な mock ctx が必要
 *   ADR-B-002 で各子 component が必要な props のみを明示的に受け取る shape に
 *   絞り込み props 化する。
 *
 * Scope:
 *  - app/src/presentation/pages/Dashboard/widgets/registry*.tsx のみ
 *  - render 関数内 + JSX prop spread ({...ctx}) も後続 PR で追加可
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-002
 *  - projects/architecture-debt-recovery/inquiry/02-widget-ctx-dependency.md §D-1
 *  - projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md §C-02
 *  - projects/widget-registry-simplification/plan.md §ADR-B-002
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
// - 初期 audit で registry*.tsx 配下の full ctx passthrough を 9 件検出
// - ADR-B-002 PR2 batch1 (commit 186355e): WaterfallChart + GrossProfitHeatmap (2 件)
// - ADR-B-002 PR2 batch2 (commit 0c7cb97): AlertPanel + UnifiedHeatmap + UnifiedStoreHourly (3 件)
// - ADR-B-002 PR3 (本 commit): Weather + ForecastTools + ConditionSummaryEnhanced (3 件)
//   + IntegratedSalesChart widgetCtx → widgetContext rename (1 件)
// - ADR-B-002 PR4 (本 commit): baseline=0 fixed mode 移行
const BASELINE_PASSTHROUGH_COUNT = 0

// `ctx={ctx}` / `widgetCtx={ctx}` の両形式を検出
const PASSTHROUGH_PATTERN = /(?:^|\s)(?:widget)?[Cc]tx=\{ctx\}/g

/** registry*.tsx を全て列挙する */
function listRegistryFiles(): string[] {
  return readdirSync(REGISTRY_DIR)
    .filter((name) => /^registry.*\.tsx$/.test(name))
    .filter((name) => !name.endsWith('.test.tsx') && !name.endsWith('.stories.tsx'))
    .map((name) => path.join(REGISTRY_DIR, name))
}

function countPassthroughInContent(content: string): number {
  const matches = content.match(PASSTHROUGH_PATTERN)
  return matches ? matches.length : 0
}

function collectPassthroughCounts(): { totalCount: number; perFile: Map<string, number> } {
  const files = listRegistryFiles()
  const perFile = new Map<string, number>()
  let totalCount = 0
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const count = countPassthroughInContent(content)
    if (count > 0) {
      const rel = path.relative(PROJECT_ROOT, file)
      perFile.set(rel, count)
      totalCount += count
    }
  }
  return { totalCount, perFile }
}

describe('fullCtxPassthroughGuard (SP-B ADR-B-002)', () => {
  it('F1: registry の full ctx passthrough 数が baseline を超えない（ratchet-down）', () => {
    const { totalCount, perFile } = collectPassthroughCounts()
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `full ctx passthrough 数 = ${totalCount} (baseline = ${BASELINE_PASSTHROUGH_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: fixed mode (baseline=0) 到達済み。新規 widget の registry 行は ' +
      '`<X ctx={ctx} />` ではなく `<X prop1={ctx.prop1} ... />` で specific props 渡しを徹底する。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-002'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_PASSTHROUGH_COUNT)
  })

  it('PASSTHROUGH_PATTERN は ctx={ctx} と widgetCtx={ctx} の両形式を検出する', () => {
    expect('<Foo ctx={ctx} />'.match(PASSTHROUGH_PATTERN)?.length).toBe(1)
    expect('<Foo widgetCtx={ctx} />'.match(PASSTHROUGH_PATTERN)?.length).toBe(1)
    expect('<Foo prop={value} />'.match(PASSTHROUGH_PATTERN)).toBeNull()
    // ctx={ctx.something} は passthrough ではないので検出しない
    expect('<Foo ctx={ctx.value} />'.match(PASSTHROUGH_PATTERN)).toBeNull()
  })
})
