/**
 * presentation 層 比較先日付独自計算ガード
 *
 * unify-period-analysis Phase 2: presentation / VM / chart / hook 配下で
 * 比較先日付（前年・前月・前週・同曜日）を独自計算することを禁止する。
 * 全ての比較先解決は `domain/models/comparisonRangeResolver` または
 * `domain/models/ComparisonScope` 経由で行わなければならない。
 *
 * ## 検出パターン
 *
 * - `new Date(year - 1, ...)` / `new Date(targetYear - 1, ...)` 等の
 *   年シフト Date 構築
 * - `setFullYear(year - 1)` 等の年シフト mutation
 * - `${year - 1}` のような template リテラル内での前年文字列構築
 *
 * ## 除外
 *
 * - 行コメント / JSDoc コメント / import type 行
 * - test ファイル (`*.test.ts*`, `__tests__/`)
 * - allowlist に登録されたファイル（恒久的に不可避な例外。Phase 2 完了時点で 0）
 *
 * ## ratchet-down
 *
 * 違反件数は 0 件で凍結される。新規違反が出たら即 fail し、修正経路は:
 *   1. `resolveComparisonRange()` または `deriveSameDowStartDateKey()` を
 *      domain から import する
 *   2. それでも domain に置けない正当理由があれば本 guard の ALLOWLIST に
 *      reason を添えて追加する（最終手段）
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * presentation 層で比較先日付の独自計算が許される例外。
 *
 * **Phase 2 で許容するのは admin UI の前年デフォルト値表示のみ**（chart 描画
 * 経路ではない）。新規追加は原則禁止 — 必ず reason を明記すること。
 */
const ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: 'presentation/pages/Admin/PrevYearMappingTab.tsx',
    reason:
      '前年マッピング設定画面の admin UI。`effectiveSourceYear = sourceYear ?? targetYear - 1` は「マッピング未指定時のデフォルト = 前年」という admin 設定 UI の意味そのもの。chart 描画経路ではない',
  },
  {
    path: 'presentation/pages/Admin/PrevYearMappingTab.vm.ts',
    reason:
      '前年マッピング設定画面の dropdown ラベル。「自動 (targetYear - 1 年 targetMonth 月)」は admin UI のデフォルト値表示。chart 描画経路ではない',
  },
]

const ALLOWLIST_PATHS = new Set(ALLOWLIST.map((e) => e.path))

/**
 * 「比較先日付の独自計算」と判定するパターン:
 * - `year - 1` / `targetYear - 1` 等を含む算術式
 * - `setFullYear(... - 1)` 等の年シフト mutation
 * - `subYears` / `subMonths` / `subWeeks` / `subDays` の呼び出し
 *
 * Note: 単なる `getFullYear() === year` のような比較演算は対象外
 * （年計算ではない）。
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\bnew\s+Date\s*\([^)]*\b(?:year|targetYear|currentYear)\s*-\s*1/,
  /\b(?:year|targetYear|currentYear)\s*-\s*1\b/,
  /\bsetFullYear\s*\([^)]*-\s*1/,
  /\bsubYears\s*\(/,
  /\bsubMonths\s*\(/,
  /\bsubWeeks\s*\(/,
  /\bsubDays\s*\(/,
]

function isCommentLine(line: string): boolean {
  const t = line.trimStart()
  return (
    t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('import type')
  )
}

function isExcludedFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  return false
}

describe('presentation 層 比較先日付独自計算ガード (unify-period-analysis Phase 2)', () => {
  it('presentation 配下で禁止パターンが検出されない (allowlist 例外を除く)', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (isExcludedFile(relPath)) continue
      if (ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${relPath}:${i + 1}: ${line.trim().slice(0, 100)}`)
            break
          }
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 2] presentation 層で比較先日付の独自計算が検出されました:',
            ...violations.map((v) => `  - ${v}`),
            '',
            '解決方法:',
            '  1. domain から resolveComparisonRange / deriveSameDowStartDateKey を import',
            '     (`@/domain/models/comparisonRangeResolver`)',
            '  2. ComparisonScope の effectivePeriod2 / alignmentMap を ctx 経由で参照',
            '  3. それでも回避不能な正当理由があれば本 guard の ALLOWLIST に reason を添えて追加',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('ALLOWLIST が現状 2 件以下である (Phase 2 完了時点の baseline、ratchet-down)', () => {
    // admin UI の前年デフォルト値表示 2 件のみ許容。新規追加は原則禁止。
    expect(ALLOWLIST.length).toBeLessThanOrEqual(2)
  })

  it('ALLOWLIST の各 entry が実在ファイルを指しているかつ実際にパターンを含む', () => {
    const orphans: string[] = []
    const noLongerMatching: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) {
        orphans.push(entry.path)
        continue
      }
      const content = fs.readFileSync(abs, 'utf-8')
      const matches = content
        .split('\n')
        .some((line) => !isCommentLine(line) && FORBIDDEN_PATTERNS.some((p) => p.test(line)))
      if (!matches) noLongerMatching.push(entry.path)
    }
    expect(orphans, `存在しないファイル: ${orphans.join(', ')}`).toEqual([])
    expect(
      noLongerMatching,
      `既にパターンを含まないファイル (allowlist から削除推奨): ${noLongerMatching.join(', ')}`,
    ).toEqual([])
  })

  it('domain resolver の存在を確認 (移行先が存在しないと意味がない)', () => {
    const resolverPath = path.join(SRC_DIR, 'domain/models/comparisonRangeResolver.ts')
    expect(fs.existsSync(resolverPath), 'comparisonRangeResolver.ts が存在しない').toBe(true)
    const content = fs.readFileSync(resolverPath, 'utf-8')
    expect(content).toContain('export function resolveComparisonRange')
    expect(content).toContain('export function deriveSameDowStartDateKey')
  })
})
