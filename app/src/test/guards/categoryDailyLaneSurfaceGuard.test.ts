// categoryDailyLaneSurfaceGuard — 部門×日次レーンの raw CTS row 露出を ratchet-down で管理
//
// unify-period-analysis Phase 6.5 Step B pre-work (Phase 6.5-1):
// 部門×日次シリーズを `FreePeriodReadModel` に吸収せず、sibling lane として
// 切り出す方針を固定 (`projects/unify-period-analysis/phase-6-5-step-b-design.md`)。
// 本 guard はその方針の軽めの先行防御として、YoYWaterfallChart ecosystem
// (4 ファイル) が `CategoryTimeSalesRecord` を直接 import / iterate している
// 現状を per-file count baseline で固定する。
//
// 狙い:
//
//   1. 現状 YoYWaterfallChart ecosystem の 4 非テストファイルが
//      `CategoryTimeSalesRecord` を import している baseline を固定
//   2. 他の widget が同じパターンで raw CTS records を触るのを防ぐ
//      (本 guard は YoYWaterfall ecosystem のみを監視。他の CTS consumer
//      = HourlyChart / DrilldownWaterfall 等は Step B scope 外なので touch しない)
//   3. Phase 6.5-5 実装時に `CategoryDailySeries` 経由に載せ替えて baseline 0 到達
//
// 本 guard は「禁止」よりも「移行目標の可視化」として機能する。
//
// ## scope の制限
//
// `CategoryTimeSalesRecord` は presentation 層全体で 23 ファイル import
// しているが、Step B の scope は YoYWaterfallChart の category 次元 projection
// のみ。HourlyChart / DrilldownWaterfall / DayDetail 等は別 widget で Step B
// の対象外のため、本 guard の監視対象に含めない。
//
// @see app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts
// @see projects/unify-period-analysis/phase-6-5-step-b-design.md
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

interface BaselineEntry {
  readonly path: string
  readonly maxOccurrences: number
  readonly reason: string
}

/**
 * YoYWaterfallChart ecosystem の `CategoryTimeSalesRecord` 直接参照 baseline。
 *
 * ratchet-down 履歴:
 *   - Phase 6.5-1 (2026-04-15): baseline = 4 ファイル × 現状参照数
 *     (builders=3, data=5, logic=3, vm=2 → 合計 13 references)
 *   - Phase 6.5-5b (2026-04-15): baseline 13 → 6
 *     - logic.ts: 3 → 0 (未使用 _periodCTS / _periodPrevCTS dummy 引数を削除)
 *     - vm.ts: 2 → 0 (aggregateTotalQuantity を CategoryDailySeries 経由に切替)
 *     - data.ts: 5 → 3 (buildCategoryData を CategoryDailySeries 経由に切替、
 *       buildFactorData は intentional floor)
 *     - builders.ts: 3 → 3 (qty 合計は lane 経由に切替したが、priceMix の
 *       Shapley path が intentional floor)
 *   - 残り 6 references (data=3 + builders=3) は **intentional permanent floor**:
 *     Shapley 5-factor decomposition (decompose5 / decomposePriceMix) は
 *     `dept|line|klass` leaf-grain key を必要とし、dept-only の
 *     CategoryDailySeries では代替不能。Step B scope 外の問題。
 *     Phase 7 以降で CategoryLeafDailySeries のような leaf-grain contract を
 *     別 phase として起こす判断は保留 (HANDOFF / inventory/05 に記録)。
 */
const CATEGORY_DAILY_RAW_ACCESS_BASELINES: readonly BaselineEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.builders.ts',
    maxOccurrences: 3,
    reason:
      'Phase 6.5-5b: 数量合計 (curTotalQty/prevTotalQty) は CategoryDailySeries 経由に移行済み。残る 3 (import + periodCTS/periodPrevCTS interface field × 2) は decomposePriceMix の Shapley 5-factor 用 leaf-grain (dept|line|klass) 入力で、intentional permanent floor',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.data.ts',
    maxOccurrences: 3,
    reason:
      'Phase 6.5-5b: buildCategoryData (dept-only waterfall) は CategoryDailySeries 経由に移行済み。残る 3 (import + buildFactorData 入力 periodCTS/periodPrevCTS × 2) は decompose5 の Shapley 5-factor 用 leaf-grain 入力で、intentional permanent floor',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.logic.ts',
    maxOccurrences: 0,
    reason:
      'Phase 6.5-5b: 未使用だった _periodCTS / _periodPrevCTS dummy 引数を削除し、CTS raw 型 import を廃止。完全 0 到達',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.vm.ts',
    maxOccurrences: 0,
    reason:
      'Phase 6.5-5b: aggregateTotalQuantity を CategoryDailySeries.grandTotals.salesQty 経由に切替、CTS raw 型 import を廃止。完全 0 到達',
  },
]

/**
 * 禁止パターン:
 *   - `CategoryTimeSalesRecord` 型 import / type use
 *
 * Phase 6.5-5 完了時に YoYWaterfall ecosystem で全 baseline が 0 になることを想定。
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [/\bCategoryTimeSalesRecord\b/g]

function countForbidden(content: string): number {
  let total = 0
  for (const pat of FORBIDDEN_PATTERNS) {
    const matches = content.match(pat)
    if (matches) total += matches.length
  }
  return total
}

describe('categoryDailyLaneSurfaceGuard (unify-period-analysis Phase 6.5 Step B pre-work)', () => {
  it('G6.5-CD: YoYWaterfall ecosystem の CategoryTimeSalesRecord 参照が per-file baseline を超えない', () => {
    const violations: string[] = []

    for (const entry of CATEGORY_DAILY_RAW_ACCESS_BASELINES) {
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
            ': CategoryTimeSalesRecord 参照が ' +
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
            '[Phase 6.5 Step B] YoYWaterfall ecosystem で CategoryTimeSalesRecord 参照が増えました:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. Phase 6.5-5 完了後は ctx.categoryDailyLane.bundle.currentSeries を消費する',
            '  2. entries[i].daily (CategoryDailyDataPoint[]) を iterate する',
            '  3. 新規 widget は最初から sibling lane 経由で書く',
            '',
            '詳細: projects/unify-period-analysis/phase-6-5-step-b-design.md',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('CATEGORY_DAILY_RAW_ACCESS_BASELINES の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of CATEGORY_DAILY_RAW_ACCESS_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('CATEGORY_DAILY_RAW_ACCESS_BASELINES の各 entry が baseline ちょうどの参照数を持つ (stale 検出)', () => {
    const downgradable: string[] = []
    for (const entry of CATEGORY_DAILY_RAW_ACCESS_BASELINES) {
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

  it('CategoryDailyBundle 型契約ファイルが存在する (Step B pre-work の型先行固定)', () => {
    const typeFile = path.join(
      SRC_DIR,
      'application/hooks/categoryDaily/CategoryDailyBundle.types.ts',
    )
    expect(fs.existsSync(typeFile), 'CategoryDailyBundle.types.ts が存在しない').toBe(true)
    const content = fs.readFileSync(typeFile, 'utf-8')
    // 契約面の主要 export を固定する
    expect(content).toContain('export interface CategoryDailyFrame')
    expect(content).toContain('export interface CategoryDailyDeptEntry')
    expect(content).toContain('export interface CategoryDailySeries')
    expect(content).toContain('export interface CategoryDailyProvenance')
    expect(content).toContain('export interface CategoryDailyMeta')
    expect(content).toContain('export interface CategoryDailyBundle')
    expect(content).toContain('export interface CategoryDailyLane')
    expect(content).toContain("'sameDate' | 'sameDayOfWeek' | 'none'")
  })

  it('projectCategoryDailySeries pure 関数 + parity test が存在する (Phase 6.5-2 意味境界の凍結)', () => {
    const projFile = path.join(
      SRC_DIR,
      'application/hooks/categoryDaily/projectCategoryDailySeries.ts',
    )
    expect(fs.existsSync(projFile), 'projectCategoryDailySeries.ts が存在しない').toBe(true)
    const projContent = fs.readFileSync(projFile, 'utf-8')
    expect(projContent).toContain('export function projectCategoryDailySeries')
    expect(projContent).toContain('EMPTY_CATEGORY_DAILY_SERIES')

    const testFile = path.join(
      SRC_DIR,
      'application/hooks/categoryDaily/__tests__/projectCategoryDailySeries.parity.test.ts',
    )
    expect(fs.existsSync(testFile), 'projectCategoryDailySeries.parity.test.ts が存在しない').toBe(
      true,
    )
  })

  it('Phase 6.5 Step B 設計ドキュメントが存在する (意思決定の固定先)', () => {
    const designFile = path.resolve(
      SRC_DIR,
      '../../projects/unify-period-analysis/phase-6-5-step-b-design.md',
    )
    expect(fs.existsSync(designFile), 'phase-6-5-step-b-design.md が存在しない').toBe(true)
    const content = fs.readFileSync(designFile, 'utf-8')
    // 要点が記載されていることを確認
    expect(content).toContain('sibling lane')
    expect(content).toContain('categoryDailyLane')
    expect(content).toContain('CategoryDailyBundle')
  })
})
