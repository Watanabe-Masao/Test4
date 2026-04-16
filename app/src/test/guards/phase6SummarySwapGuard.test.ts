// phase6SummarySwapGuard — Phase 6 Step A の summary 差し替え結果を凍結する
//
// unify-period-analysis Phase 6 Step A:
// `ConditionSummaryEnhanced` / `ExecSummaryBarWidget` の prev-year summary
// 読み出しを `ctx.freePeriodLane.bundle.fact.comparisonSummary` 経由
// (`selectPrevYearSummaryFromFreePeriod` selector + `preferFreePeriodPrevYearSummary`
// composer) に差し替えた。本 guard は **再発防止 (regression freeze)** として、
// 対象 widget で旧 summary 命名のバラ参照が増えないことを per-file count baseline
// で監視する。
//
// ## 監視対象 widget
//
//   - presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx
//   - presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx
//
// ## 監視対象パターン (旧命名のバラ参照)
//
//   - `prevYear.totalSales`
//   - `prevYear.totalCustomers`
//   - `prevYearMonthlyKpi.monthlyTotal.sales`
//   - `prevYearMonthlyKpi.sameDow.sales`
//   - `prevYearMonthlyKpi.prevYearMonthlySales`  (legacy 命名の defensive)
//
// ## per-file baseline (Step A 完了時点)
//
//   - ConditionSummaryEnhanced.tsx: 0 件
//     (override は `selectPrevYearSummaryFromFreePeriod` 出力を
//      `buildBudgetHeader` 第 5 引数として渡す形で完結。直接読みなし)
//
//   - ExecSummaryBarWidget.tsx: 2 件
//     (legacy adapter `selectPrevYearSummaryFromLegacy({...})` の引数構築箇所で
//      `prevYear.totalSales` を 2 回参照する。**唯一の集約点**。
//      bundle 未ロード時の transition fallback、Step B で 0 到達予定)
//
// ## ratchet-down
//
// baseline は減少方向にのみ更新できる (`<=`)。Step B (`FreePeriodReadModel`
// 次元拡張) で bundle が常時ロード保証されるようになったら 0 に到達する。
//
// @see app/src/application/readModels/freePeriod/selectPrevYearSummaryFromFreePeriod.ts
// @see projects/completed/unify-period-analysis/inventory/05-phase6-widget-consumers.md
// @see projects/completed/unify-period-analysis/HANDOFF.md §Phase 6 Step A
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

interface BaselineEntry {
  readonly path: string
  readonly maxOccurrences: number
  readonly reason: string
}

const SUMMARY_SWAP_BASELINES: readonly BaselineEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx',
    maxOccurrences: 0,
    reason:
      'Phase 6 Step A: buildBudgetHeader override 経由のみ使用。widget 内に直接 prev-year 旧命名読みは存在しない',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx',
    maxOccurrences: 2,
    reason:
      'Phase 6 Step A: selectPrevYearSummaryFromLegacy({...}) adapter 引数構築箇所のみ。totalSales を 2 回参照 (totalSales / prevYearMonthlySales)。Step B 完了時に 0 到達予定',
  },
]

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\bprevYear\.totalSales\b/g,
  /\bprevYear\.totalCustomers\b/g,
  /\bprevYearMonthlyKpi\.monthlyTotal\.sales\b/g,
  /\bprevYearMonthlyKpi\.sameDow\.sales\b/g,
  /\bprevYearMonthlyKpi\.prevYearMonthlySales\b/g,
]

function countForbidden(content: string): number {
  let total = 0
  for (const pat of FORBIDDEN_PATTERNS) {
    const matches = content.match(pat)
    if (matches) total += matches.length
  }
  return total
}

describe('phase6SummarySwapGuard (unify-period-analysis Phase 6 Step A)', () => {
  it('Step A 対象 widget の旧 summary 命名読みが per-file baseline を超えない', () => {
    const violations: string[] = []

    for (const entry of SUMMARY_SWAP_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) {
        violations.push(entry.path + ': ファイルが存在しない')
        continue
      }
      const content = fs.readFileSync(abs, 'utf-8')
      const count = countForbidden(content)
      if (count > entry.maxOccurrences) {
        violations.push(
          entry.path +
            ': 旧 summary 命名の参照が ' +
            count +
            ' 件 (baseline: ' +
            entry.maxOccurrences +
            ')',
        )
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 6 Step A] summary swap 後の widget で旧 prev-year 命名読みが増えました:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. ctx.freePeriodLane.bundle.fact 経由 (selectPrevYearSummaryFromFreePeriod) を使う',
            '  2. bundle 未ロード時は selectPrevYearSummaryFromLegacy({...}) で 1 箇所に集約する',
            '  3. composer (preferFreePeriodPrevYearSummary) で freePeriod 優先 + legacy fallback を表現する',
            '',
            '詳細: app/src/application/readModels/freePeriod/selectPrevYearSummaryFromFreePeriod.ts',
            '      projects/completed/unify-period-analysis/HANDOFF.md §Phase 6 Step A',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('SUMMARY_SWAP_BASELINES の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of SUMMARY_SWAP_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('SUMMARY_SWAP_BASELINES の各 entry が実際に参照件数 ≤ baseline (stale 検出)', () => {
    // baseline より明らかに少ないファイル (= さらに ratchet-down できる) を検出する
    const downgradable: string[] = []
    for (const entry of SUMMARY_SWAP_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const count = countForbidden(content)
      if (count < entry.maxOccurrences) {
        downgradable.push(
          entry.path + ': 実際 ' + count + ' 件 / baseline ' + entry.maxOccurrences + ' 件',
        )
      }
    }
    expect(
      downgradable,
      [
        'baseline を下げられるファイルがあります (ratchet-down してください):',
        ...downgradable.map((v) => '  - ' + v),
      ].join('\n'),
    ).toEqual([])
  })

  it('selectPrevYearSummaryFromFreePeriod selector ファイルが存在する', () => {
    const selectorFile = path.join(
      SRC_DIR,
      'application/readModels/freePeriod/selectPrevYearSummaryFromFreePeriod.ts',
    )
    expect(fs.existsSync(selectorFile)).toBe(true)
    const content = fs.readFileSync(selectorFile, 'utf-8')
    // 主要 export を固定
    expect(content).toContain('export function selectPrevYearSummaryFromFreePeriod')
    expect(content).toContain('export function selectPrevYearSummaryFromLegacy')
    expect(content).toContain('export function preferFreePeriodPrevYearSummary')
    expect(content).toContain('PrevYearSummarySource')
  })

  it('Step A 対象 widget が共通 selector を実 import している (コメント/文字列は除外)', () => {
    // import 文の中に selectPrevYearSummaryFromFreePeriod があることを regex で検証。
    // 単純な content.includes だとコメントや文字列リテラルでも pass するため、
    // 実際の `import { ... selectPrevYearSummaryFromFreePeriod ... } from '...'`
    // 形のみを許可する。multiline import に対応するため multiline flag を使う。
    const selectorImportPattern =
      /import\s+(?:type\s+)?\{[^}]*\bselectPrevYearSummaryFromFreePeriod\b[^}]*\}\s+from\s+['"][^'"]+['"]/m

    for (const entry of SUMMARY_SWAP_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      expect(
        selectorImportPattern.test(content),
        entry.path + ': selectPrevYearSummaryFromFreePeriod を実 import していない',
      ).toBe(true)
    }
  })
})
