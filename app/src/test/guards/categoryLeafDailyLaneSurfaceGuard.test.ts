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
// @see projects/presentation-cts-surface-ratchetdown/HANDOFF.md
// @see projects/presentation-cts-surface-ratchetdown/plan.md
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
 *
 * 各 entry の reason は presentation-cts-surface-ratchetdown の Phase 構造
 * (plan.md) に対応する移行グループを示す。Phase 完了時にまとめて削除する。
 */
const CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST: readonly {
  readonly path: string
  readonly reason: string
}[] = [
  // ── Phase 2: widget 系 (DayDetailModal 直下 + 支援ファイル) ─────────────
  {
    path: 'presentation/pages/Dashboard/widgets/HourlyChart.tsx',
    reason: 'phase-2: HourlyChart 系 (DayDetailModal 時間帯タブ)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/HourlyChart.builders.ts',
    reason: 'phase-2: HourlyChart 系 (DayDetailModal 時間帯タブ)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/HourlyChart.logic.ts',
    reason: 'phase-2: HourlyChart 系 (DayDetailModal 時間帯タブ)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailHourlyTab.tsx',
    reason: 'phase-2: DayDetailModal タブ (HourlyChart 接続)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailSalesTab.tsx',
    reason: 'phase-2: DayDetailModal タブ (DrilldownWaterfall 接続)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx',
    reason: 'phase-2: DrilldownWaterfall 系 (Shapley 5 要素分解)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DrilldownWaterfall.builders.ts',
    reason: 'phase-2: DrilldownWaterfall 系 (Shapley 5 要素分解)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx',
    reason: 'phase-2: CategoryFactor 系 (DrilldownWaterfall 兄弟)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/categoryFactorBreakdownLogic.ts',
    reason: 'phase-2: CategoryFactor 系 (DrilldownWaterfall 兄弟)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/categoryFactorUtils.ts',
    reason: 'phase-2: CategoryFactor 系 (DrilldownWaterfall 兄弟)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/drilldownUtils.ts',
    reason: 'phase-2: DrilldownWaterfall 支援 utils',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownData.ts',
    reason: 'phase-2: useDrilldown 系 hook',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownDataLogic.ts',
    reason: 'phase-2: useDrilldown 系 hook',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownRecords.ts',
    reason: 'phase-2: useDrilldown 系 hook',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownRecordsBuilders.ts',
    reason: 'phase-2: useDrilldown 系 hook',
  },
  // ── Phase 3: YoYWaterfall 系 ──────────────────────────────────────────
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.builders.ts',
    reason: 'phase-3: YoYWaterfall 系 (前年差 waterfall widget)',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.data.ts',
    reason: 'phase-3: YoYWaterfall 系 (前年差 waterfall widget)',
  },
  // ── Phase 3: 階層・PeriodFilter 系 ─────────────────────────────────────
  {
    path: 'presentation/components/charts/categoryHierarchyHooks.ts',
    reason: 'phase-3: カテゴリ階層 hook (dept/line/klass dropdown)',
  },
  {
    path: 'presentation/components/charts/periodFilterHooks.ts',
    reason: 'phase-3: PeriodFilter hook (期間絞り込み)',
  },
  {
    path: 'presentation/components/charts/useHierarchyDropdown.ts',
    reason: 'phase-3: 階層 dropdown hook',
  },
  // ── Phase 4: context / widget 基盤 ────────────────────────────────────
  {
    path: 'presentation/components/widgets/types.ts',
    reason: 'phase-4: widget 基盤 type 定義',
  },
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    reason: 'phase-4: 統合 widget context (slice 配信)',
  },
  // ── Phase 4: Admin ────────────────────────────────────────────────────
  {
    path: 'presentation/pages/Admin/RawDataTabBuilders.ts',
    reason: 'phase-4: Admin RawData タブ (生データ表示)',
  },
]

const CATEGORY_LEAF_DAILY_ALLOWLIST_PATHS = new Set(
  CATEGORY_LEAF_DAILY_RAW_RECORD_ALLOWLIST.map((e) => e.path),
)

const RAW_RECORD_TYPE_PATTERNS: readonly RegExp[] = [/\bCategoryTimeSalesRecord\b/]

/**
 * 初期 baseline = 23 件 (production only)。
 * `timeSlotLaneSurfaceGuard` と同じ policy で test ファイルは guard 対象外。
 * ratchet-down で 0 を目指す。新規追加は禁止 (allowlist 数の単調減少)。
 */
const CATEGORY_LEAF_DAILY_BASELINE = 23

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
            '詳細: projects/presentation-cts-surface-ratchetdown/HANDOFF.md',
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
    expect(content).toContain('export type CategoryLeafDailyEntry')
    expect(content).toContain('export interface CategoryLeafDailySeries')
    expect(content).toContain('export interface CategoryLeafDailyBundle')
    expect(content).toContain('export interface CategoryLeafDailyProvenance')
    expect(content).toContain('export interface CategoryLeafDailyMeta')
  })

  it('presentation-cts-surface-ratchetdown 方針ドキュメントが存在する (意思決定の固定先)', () => {
    const handoffFile = path.resolve(
      SRC_DIR,
      '../../projects/presentation-cts-surface-ratchetdown/HANDOFF.md',
    )
    const planFile = path.resolve(
      SRC_DIR,
      '../../projects/presentation-cts-surface-ratchetdown/plan.md',
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
