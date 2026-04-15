// storeDailyLaneSurfaceGuard — 店舗別日次レーンの raw daily 露出を ratchet-down で管理
//
// unify-period-analysis Phase 6.5 Step B pre-work (Phase 6.5-1):
// 店舗別日次シリーズを `FreePeriodReadModel` に吸収せず、sibling lane として
// 切り出す方針を固定 (`projects/unify-period-analysis/phase-6-5-step-b-design.md`)。
// 本 guard はその方針の軽めの先行防御として、`SalesPurchaseComparisonChart.tsx`
// が `s.result.daily` を直接 iterate している現状を per-file count baseline で
// 固定する。
//
// 狙い:
//
//   1. 現状 `SalesPurchaseComparisonChart.tsx` で 2 箇所の
//      `s.result.daily` / `result.daily` 直接アクセスを baseline として凍結
//   2. 他の widget が同じパターン (ctx.allStoreResults 経由の per-store
//      .daily iterate) で raw daily を触るのを防ぐ
//   3. Phase 6.5-5 実装時に `StoreDailySeries` 経由に載せ替えて baseline 0 到達
//
// 本 guard は「禁止」よりも「移行目標の可視化」として機能する。
//
// @see app/src/application/hooks/storeDaily/StoreDailyBundle.types.ts
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
 * 店舗別日次 raw アクセスを許可する per-file baseline。
 *
 * ratchet-down 履歴:
 *   - Phase 6.5-1 (2026-04-15): baseline = 2 (SalesPurchaseComparisonChart.tsx)
 *     (1 = chartData 内の s.result.daily.get(d) による sales/purchase 抽出,
 *      1 = computeEstimatedInventory への s.result.daily 引数)
 *   - Phase 6.5-5 (2026-04-15): baseline 2 → 1
 *     chartData の sales/purchase 抽出は `ctx.storeDailyLane.bundle.currentSeries`
 *     経由に移行済み。残る 1 は `computeEstimatedInventory(s.result.daily, ...)`
 *     で、これは StoreDailySeries に含まれない markup/discount rate + 仕入内訳
 *     を必要とする domain 計算のため **intentional な permanent floor**。
 *     StoreDailySeries 拡張または inventory projection 新設なしには 0 化できない
 *     (Step B scope 外)。本 1 件は規範的に許容される最終状態。
 */
const STORE_DAILY_RAW_ACCESS_BASELINES: readonly BaselineEntry[] = [
  {
    path: 'presentation/components/charts/SalesPurchaseComparisonChart.tsx',
    maxOccurrences: 1,
    reason:
      'Phase 6.5-5: sales/purchase 抽出は lane 経由に移行済み。残る 1 は computeEstimatedInventory への s.result.daily 引数で、StoreDailySeries に含まれない markup/discount 計算のための intentional な permanent floor',
  },
]

/**
 * 禁止パターン:
 *   - `s.result.daily` / `result.daily` の iterate access
 *   - per-store per-day 手動ループ
 *
 * Phase 6.5-5 完了時に全 baseline が 0 になることを想定。
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [/\bresult\.daily\b/g]

function countForbidden(content: string): number {
  let total = 0
  for (const pat of FORBIDDEN_PATTERNS) {
    const matches = content.match(pat)
    if (matches) total += matches.length
  }
  return total
}

describe('storeDailyLaneSurfaceGuard (unify-period-analysis Phase 6.5 Step B pre-work)', () => {
  it('G6.5-SD: Step B 対象 widget の result.daily 直接アクセスが per-file baseline を超えない', () => {
    const violations: string[] = []

    for (const entry of STORE_DAILY_RAW_ACCESS_BASELINES) {
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
            ': result.daily 直接アクセスが ' +
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
            '[Phase 6.5 Step B] 店舗別日次の raw daily 直接アクセスが増えました:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. Phase 6.5-5 完了後は ctx.storeDailyLane.bundle.currentSeries を消費する',
            '  2. entries[i].daily (StoreDailyDataPoint[]) を iterate する',
            '  3. 新規 widget は最初から sibling lane 経由で書く',
            '',
            '詳細: projects/unify-period-analysis/phase-6-5-step-b-design.md',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('STORE_DAILY_RAW_ACCESS_BASELINES の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of STORE_DAILY_RAW_ACCESS_BASELINES) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('STORE_DAILY_RAW_ACCESS_BASELINES の各 entry が baseline ちょうどの参照数を持つ (stale 検出)', () => {
    const downgradable: string[] = []
    for (const entry of STORE_DAILY_RAW_ACCESS_BASELINES) {
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

  it('StoreDailyBundle 型契約ファイルが存在する (Step B pre-work の型先行固定)', () => {
    const typeFile = path.join(SRC_DIR, 'application/hooks/storeDaily/StoreDailyBundle.types.ts')
    expect(fs.existsSync(typeFile), 'StoreDailyBundle.types.ts が存在しない').toBe(true)
    const content = fs.readFileSync(typeFile, 'utf-8')
    // 契約面の主要 export を固定する
    expect(content).toContain('export interface StoreDailyFrame')
    expect(content).toContain('export interface StoreDailyStoreEntry')
    expect(content).toContain('export interface StoreDailySeries')
    expect(content).toContain('export interface StoreDailyProvenance')
    expect(content).toContain('export interface StoreDailyMeta')
    expect(content).toContain('export interface StoreDailyBundle')
    expect(content).toContain('export interface StoreDailyLane')
    expect(content).toContain("'sameDate' | 'sameDayOfWeek' | 'none'")
  })

  it('projectStoreDailySeries pure 関数 + parity test が存在する (Phase 6.5-2 意味境界の凍結)', () => {
    const projFile = path.join(SRC_DIR, 'application/hooks/storeDaily/projectStoreDailySeries.ts')
    expect(fs.existsSync(projFile), 'projectStoreDailySeries.ts が存在しない').toBe(true)
    const projContent = fs.readFileSync(projFile, 'utf-8')
    expect(projContent).toContain('export function projectStoreDailySeries')
    expect(projContent).toContain('EMPTY_STORE_DAILY_SERIES')

    const testFile = path.join(
      SRC_DIR,
      'application/hooks/storeDaily/__tests__/projectStoreDailySeries.parity.test.ts',
    )
    expect(fs.existsSync(testFile), 'projectStoreDailySeries.parity.test.ts が存在しない').toBe(
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
    expect(content).toContain('storeDailyLane')
    expect(content).toContain('StoreDailyBundle')
  })
})
