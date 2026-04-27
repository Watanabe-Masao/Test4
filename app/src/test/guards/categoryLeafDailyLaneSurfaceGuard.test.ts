/**
 * @responsibility R:unclassified
 */

// categoryLeafDailyLaneSurfaceGuard — カテゴリ leaf-grain 日次比較レーンの
// raw record 露出を ratchet-down で管理
//
// presentation-cts-surface-ratchetdown Phase 1:
// `category-leaf-daily-series` で `CategoryLeafDailyBundle` 契約と
// `CategoryLeafDailyEntry` 型が整ったため、presentation 層が
// `CategoryTimeSalesRecord` (infra 由来 raw record 型) を直接 import している
// 23 件 (production) を初期 baseline として固定し、段階的に
// `CategoryLeafDailyEntry` 参照へ置換する。
//
// 狙い:
//
//   1. 現状 23 件の raw record consumer を allowlist 化し、新規 widget が
//      同じパターンで raw record を触るのを防ぐ
//   2. Phase 2-N で widget をグループ化して数件ずつ置換し baseline を
//      ratchet-down する
//   3. baseline 0 到達後、guard を「追加禁止」固定モードに移行する
//
// test ファイルは fixture 構築のため raw 型を使う方が自然なので
// `timeSlotLaneSurfaceGuard` と同様に collectTsFiles の test 除外に任せる
// (HANDOFF §3.2)。
//
// @see projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md
// @see projects/completed/presentation-cts-surface-ratchetdown/plan.md
// @see app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts
// @see app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts (参考実装)
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * `CategoryTimeSalesRecord` を presentation 層 (production) で import してよい
 * ファイルの allowlist。
 *
 * ratchet-down 履歴:
 *   - Phase 1 (2026-04-19): baseline 23 (initial pin / production only)
 *   - Phase 2 batch-1 (2026-04-19): 23 → 17。DrilldownWaterfall + CategoryFactor
 *     クラスタ 6 ファイル (DrilldownWaterfall.tsx / .builders.ts /
 *     CategoryFactorBreakdown.tsx / categoryFactorBreakdownLogic.ts /
 *     categoryFactorUtils.ts / drilldownUtils.ts) を `CategoryLeafDailyEntry`
 *     参照に置換。
 *   - Phase 2 batch-2 (2026-04-19): 17 → 12。HourlyChart + DayDetail タブ
 *     クラスタ 5 ファイル (HourlyChart.tsx / .builders.ts / .logic.ts /
 *     DayDetailHourlyTab.tsx / DayDetailSalesTab.tsx) を `CategoryLeafDailyEntry`
 *     参照に置換。HourlyChart 系は `HourlyWeatherRecord` との combined import を
 *     2 行に分離。
 *   - Phase 2 batch-3 (2026-04-19): 12 → 8。useDrilldown 系 hook 4 ファイル
 *     (useDrilldownData.ts / useDrilldownDataLogic.ts / useDrilldownRecords.ts /
 *     useDrilldownRecordsBuilders.ts) を `CategoryLeafDailyEntry` 参照に置換。
 *     これで Phase 2 (widget 系) 完了。残 8 件は Phase 3 以降 (YoYWaterfall +
 *     階層フィルタ + context/widget 基盤 + Admin)。
 *   - Phase 3 (2026-04-19): 8 → 3。YoYWaterfall 系 2 ファイル
 *     (YoYWaterfallChart.builders.ts / .data.ts) + 階層・PeriodFilter 系 3 ファイル
 *     (categoryHierarchyHooks.ts / periodFilterHooks.ts / useHierarchyDropdown.ts)
 *     を `CategoryLeafDailyEntry` 参照に置換。YoYWaterfallChart.builders.ts は
 *     `DailyRecord` との combined import を 2 行に分離。残 3 件は Phase 4
 *     (context / widget 基盤 + Admin) で 0 到達予定。
 *   - Phase 4 / baseline 0 到達 (2026-04-19): 3 → 0。RawDataTabBuilders.ts の
 *     型 import を `CategoryLeafDailyEntry` に置換。useUnifiedWidgetContext.ts /
 *     components/widgets/types.ts の JSDoc コメントから `CategoryTimeSalesRecord`
 *     の literal 言及を除去 (動作は不変。guard は comments も \\b word boundary で
 *     match するため reword が必要だった)。allowlist 空。新規追加は禁止 (固定モード)。
 *
 * ratchet-down 完了。以降本 guard は「追加禁止」固定モードとして機能する。
 */
const CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST: readonly {
  readonly path: string
  readonly reason: string
}[] = []

const CATEGORY_LEAF_DAILY_ALLOWLIST_PATHS = new Set(
  CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST.map((e) => e.path),
)

const RAW_RECORD_TYPE_PATTERNS: readonly RegExp[] = [/\bCategoryTimeSalesRecord\b/]

/**
 * 現 baseline = 0 件 (production only, 全 Phase 完了 = 追加禁止 固定モード)。
 * 初期 baseline 23 → 17 → 12 → 8 → 3 → 0 (全 23 ファイルを
 * `CategoryLeafDailyEntry` 参照に移行完了)。
 * `timeSlotLaneSurfaceGuard` と同じ policy で test ファイルは guard 対象外。
 * 本 guard は以降「追加禁止」固定モードとして presentation 層 (production) への
 * 新規 `CategoryTimeSalesRecord` 参照混入を阻止する。
 */
const CATEGORY_LEAF_DAILY_BASELINE = 0

describe('categoryLeafDailyLaneSurfaceGuard (presentation-cts-surface-ratchetdown Phase 1)', () => {
  it('G6-CLD: CategoryTimeSalesRecord の presentation 層 import は allowlist 内に限定される', () => {
    // collectTsFiles は __tests__/ ディレクトリと *.test.ts(x) を既定で除外する
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (CATEGORY_LEAF_DAILY_ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of RAW_RECORD_TYPE_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(relPath + ': matched ' + pattern)
          break
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 1] CategoryTimeSalesRecord を presentation 層で新規に直接参照しないでください:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. `CategoryLeafDailyEntry` (application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts) を import する',
            '  2. bundle 経由 (useDayDetailPlan の dayLeafBundle / cumLeafBundle 等) で entries を消費する',
            '  3. やむを得ず追加する場合は CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST に reason を添えて登録し、',
            '     CATEGORY_LEAF_DAILY_BASELINE を更新する (ratchet-up は禁止 — Phase 計画と整合させること)',
            '',
            '詳細: projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('baseline: CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST は CATEGORY_LEAF_DAILY_BASELINE と一致する', () => {
    // ratchet-down: allowlist を減らしたら BASELINE も同数に下げる。
    // 増やす方向は禁止 (新規 raw record 直接 import の発生は guard で別途検出される)。
    expect(CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST.length).toBe(CATEGORY_LEAF_DAILY_BASELINE)
  })

  it('CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST の各 entry が実際に CategoryTimeSalesRecord を import している (stale 検出)', () => {
    const noLonger: string[] = []
    for (const entry of CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const hasImport = RAW_RECORD_TYPE_PATTERNS.some((p) => p.test(content))
      if (!hasImport) noLonger.push(entry.path)
    }
    expect(
      noLonger,
      'allowlist に残っているが既に移行済みのファイル (削除して baseline を ratchet-down してください): ' +
        noLonger.join(', '),
    ).toEqual([])
  })

  it('CategoryLeafDailyBundle 型契約ファイルが存在する (Phase 1 の置換先固定)', () => {
    const typeFile = path.join(
      SRC_DIR,
      'application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts',
    )
    expect(fs.existsSync(typeFile), 'CategoryLeafDailyBundle.types.ts が存在しない').toBe(true)
    const content = fs.readFileSync(typeFile, 'utf-8')
    // 置換先となる主要 export を固定する
    expect(content).toContain('export interface CategoryLeafDailyFrame')
    // Phase 4 (2026-04-20): intersection (type) → 独立 interface に昇格済み
    expect(content).toContain('export interface CategoryLeafDailyEntry')
    expect(content).toContain('export interface CategoryLeafDailySeries')
    expect(content).toContain('export interface CategoryLeafDailyBundle')
    expect(content).toContain('export interface CategoryLeafDailyProvenance')
    expect(content).toContain('export interface CategoryLeafDailyMeta')
  })

  it('presentation-cts-surface-ratchetdown 方針ドキュメントが存在する (意思決定の固定先)', () => {
    // archive 後は projects/completed/ 配下に移動済み (2026-04-19)
    const handoffFile = path.resolve(
      SRC_DIR,
      '../../projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md',
    )
    const planFile = path.resolve(
      SRC_DIR,
      '../../projects/completed/presentation-cts-surface-ratchetdown/plan.md',
    )
    expect(fs.existsSync(handoffFile), 'HANDOFF.md が存在しない').toBe(true)
    expect(fs.existsSync(planFile), 'plan.md が存在しない').toBe(true)
    const handoff = fs.readFileSync(handoffFile, 'utf-8')
    // 要点が記載されていることを確認
    expect(handoff).toContain('CategoryTimeSalesRecord')
    expect(handoff).toContain('CategoryLeafDailyEntry')
    expect(handoff).toContain('ratchet-down')
  })
})
