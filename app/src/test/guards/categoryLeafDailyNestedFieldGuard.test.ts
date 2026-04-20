// categoryLeafDailyNestedFieldGuard — CategoryLeafDailyEntry の nested field
// 参照 (.department.code / .line.name / .klass.code 等) を presentation 層で
// ratchet-down 管理し、alias 解除 (Phase 4) に向けた field surface の 2 層防御を敷く。
//
// category-leaf-daily-entry-shape-break Phase 2 (2026-04-20):
// Phase 1 で `CategoryLeafDailyEntry` を intersection 型に進化させ flat field
// (`deptCode / deptName / lineCode / lineName / klassCode / klassName`) を
// 並行提供した。ただし intersection のため raw 側の nested field
// (`.department.code` 等) も依然アクセス可能。
//
// 先行 `categoryLeafDailyLaneSurfaceGuard` (baseline 0 / 固定モード) は
// `CategoryTimeSalesRecord` **型 import** を封じるが、alias 経由の field 参照
// までは検出できない。本 guard は **field access surface** を別軸で管理し、
// 「alias 側に触れる presentation」を段階的に flat field に移行する。
//
// 狙い:
//
//   1. 初期 baseline 7 ファイル (production only) を allowlist 化し、新規
//      widget が nested field access を追加するのを防ぐ
//   2. Phase 3 で consumer を段階移行 (1 PR で 1-2 ファイル) し baseline を
//      ratchet-down する
//   3. baseline 0 到達後 (Phase 4 alias 解除と同時)、guard を「追加禁止」
//      固定モードに移行する → field surface でも 2 層防御が完成する
//
// test ファイルは fixture 構築のため nested field 参照が自然なので
// `categoryLeafDailyLaneSurfaceGuard` と同様に collectTsFiles の test 除外に
// 任せる。
//
// @see projects/category-leaf-daily-entry-shape-break/HANDOFF.md
// @see projects/category-leaf-daily-entry-shape-break/plan.md
// @see app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts
// @see app/src/application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries.ts
// @see app/src/test/guards/categoryLeafDailyLaneSurfaceGuard.test.ts (先行 2 層防御)
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * `.department.code / .department.name / .line.code / .line.name / .klass.code /
 * .klass.name` を presentation 層 (production) で参照してよいファイルの
 * allowlist。
 *
 * ratchet-down 履歴:
 *   - Phase 2 (2026-04-20): baseline 7 (initial pin / production only)
 *     - 内訳: categoryFactorBreakdownLogic.ts / useHierarchyDropdown.ts /
 *       drilldownUtils.ts / HourlyChart.logic.ts / DrilldownWaterfall.tsx /
 *       categoryHierarchyHooks.ts / categoryFactorUtils.ts
 *   - Phase 3 batch-1 (2026-04-20): 7 → 5。DrilldownWaterfall クラスタ
 *     2 ファイル (DrilldownWaterfall.tsx / drilldownUtils.ts) を flat field
 *     (deptCode / deptName / lineCode / lineName / klassCode / klassName) 参照に置換。
 *   - Phase 3 batch-2 (2026-04-20): 5 → 4。HourlyChart.logic.ts の 4 件を
 *     flat field 参照に置換 (key 文字列生成 + dept/line/klass label フォールバック)。
 *   - Phase 3 batch-3 (2026-04-20): 4 → 2。Hierarchy フィルタ 2 ファイル
 *     (categoryHierarchyHooks.ts / useHierarchyDropdown.ts) を flat field 参照に置換。
 *   - Phase 3 batch-4 (2026-04-20): 2 → 0。CategoryFactor 系 2 ファイル
 *     (categoryFactorUtils.ts / categoryFactorBreakdownLogic.ts) を flat field 参照に置換。
 *     presentation production 層で nested field 参照が物理的に 0 に到達。
 *   - Phase 4 (予定): alias を intersection → 独立 interface に昇格させ
 *     nested field の型レベル消滅と同時に guard を「追加禁止」固定モードへ
 */
const CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST: readonly {
  readonly path: string
  readonly reason: string
}[] = []

const CATEGORY_LEAF_DAILY_NESTED_ALLOWLIST_PATHS = new Set(
  CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST.map((e) => e.path),
)

/**
 * 検出対象: `.department.code` / `.department.name` / `.line.code` / `.line.name` /
 *           `.klass.code` / `.klass.name`
 *
 * 単語境界 `\b` を使い、意図しない suffix match (例: `.departmental.xxx`) を避ける。
 */
const NESTED_FIELD_PATTERN = /\.(department|line|klass)\.(code|name)\b/

/**
 * 現 baseline = 0 件 (production only, Phase 3 batch-1〜4 完了後)。
 * presentation 層で nested field 参照が物理的に消失。以降は新規混入の防止のみ。
 * Phase 4 で alias 解除を実施すると型レベルでも消滅し、本 guard は
 * 「追加禁止」固定モードへ移行する。
 */
const CATEGORY_LEAF_DAILY_NESTED_BASELINE = 0

describe('categoryLeafDailyNestedFieldGuard (category-leaf-daily-entry-shape-break Phase 2)', () => {
  it('G6-CLD-NESTED: CategoryLeafDailyEntry の nested field (.department/.line/.klass) の presentation 参照は allowlist 内に限定される', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (CATEGORY_LEAF_DAILY_NESTED_ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      if (NESTED_FIELD_PATTERN.test(content)) {
        violations.push(relPath)
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 2] CategoryLeafDailyEntry の nested field (.department/.line/.klass) を presentation 層で新規参照しないでください:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. flat field (deptCode / deptName / lineCode / lineName / klassCode / klassName) を使う',
            '     例: entry.department.code → entry.deptCode / entry.department.name → entry.deptName',
            '  2. flat field は projectCategoryLeafDailySeries / toCategoryLeafDailyEntries で生成済み',
            '     (Phase 1 完了 — 2026-04-19)',
            '  3. やむを得ず追加する場合は CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST に reason を添えて登録し、',
            '     CATEGORY_LEAF_DAILY_NESTED_BASELINE を更新する (ratchet-up は禁止)',
            '',
            '詳細: projects/category-leaf-daily-entry-shape-break/HANDOFF.md',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('baseline: CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST は CATEGORY_LEAF_DAILY_NESTED_BASELINE と一致する', () => {
    // ratchet-down: allowlist を減らしたら BASELINE も同数に下げる。
    // 増やす方向は禁止 (新規 nested field 参照は guard 本体で別途検出される)。
    expect(CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST.length).toBe(
      CATEGORY_LEAF_DAILY_NESTED_BASELINE,
    )
  })

  it('CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST の各 entry が実際に nested field 参照を含む (stale 検出)', () => {
    const noLonger: string[] = []
    for (const entry of CATEGORY_LEAF_DAILY_NESTED_FIELD_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      if (!NESTED_FIELD_PATTERN.test(content)) noLonger.push(entry.path)
    }
    expect(
      noLonger,
      'allowlist に残っているが既に flat field に移行済みのファイル (削除して baseline を ratchet-down してください): ' +
        noLonger.join(', '),
    ).toEqual([])
  })

  it('flat field の生成点 (projectCategoryLeafDailySeries / toCategoryLeafDailyEntries) が存在する', () => {
    const projFile = path.join(
      SRC_DIR,
      'application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries.ts',
    )
    expect(fs.existsSync(projFile), 'projectCategoryLeafDailySeries.ts が存在しない').toBe(true)
    const content = fs.readFileSync(projFile, 'utf-8')
    // Phase 1 で切り出した flat field 生成関数の export を固定する
    expect(content).toContain('export function toCategoryLeafDailyEntries')
    expect(content).toContain('export function projectCategoryLeafDailySeries')
    // flat field の生成が存在することを確認
    expect(content).toContain('deptCode')
    expect(content).toContain('deptName')
    expect(content).toContain('lineCode')
    expect(content).toContain('lineName')
    expect(content).toContain('klassCode')
    expect(content).toContain('klassName')
  })
})
