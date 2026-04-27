/**
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */

// weatherCorrelationProjectionGuard — 天気相関用の日次売上 projection を
// presentation に戻さないための凍結 guard
//
// unify-period-analysis Phase 6 Step D:
// 天気相関分析用の日別 sales / customers projection は pure helper
// (`buildDailySalesProjection`) に集約されている。本 guard は対象 widget
// (`WeatherAnalysisPanel.tsx`) で以下のパターンが再出現することを禁止する:
//
//   - `toDateKeyFromParts(...)` の直接呼び出し (dateKey 生成は row に任せる)
//   - `new Map<number, ...>` 形式の day ベース再集計
//   - 独自の day rollup ループ
//
// これらは全て `buildDailySalesProjection` の責務。presentation では
// helper を呼ぶだけにする。
//
// baseline: 0 (pattern 再出現を一切許さない)
//
// @see app/src/features/weather/application/projections/buildDailySalesProjection.ts
// @see app/src/presentation/components/charts/WeatherAnalysisPanel.tsx
// @see projects/completed/unify-period-analysis/HANDOFF.md §Phase 6 Step D
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

/** 監視対象 (天気相関 widget 群) */
const WATCHED_FILES: readonly string[] = ['presentation/components/charts/WeatherAnalysisPanel.tsx']

/**
 * 禁止パターン:
 *   - toDateKeyFromParts(...) の直接呼び出し
 *   - day キー (`Map<number,`) の再集計
 *   - salesDaily を手組みする ad hoc 変換
 */
const FORBIDDEN_PATTERNS: readonly { readonly pattern: RegExp; readonly label: string }[] = [
  {
    pattern: /\btoDateKeyFromParts\s*\(/g,
    label: 'toDateKeyFromParts() 直接呼び出し (dateKey は row.dateKey を使う)',
  },
  {
    pattern: /\bnew\s+Map\s*<\s*number\s*,/g,
    label: '`new Map<number, ...>` の day ベース再集計 (helper で済ませる)',
  },
]

describe('weatherCorrelationProjectionGuard (unify-period-analysis Phase 6 Step D)', () => {
  it('天気相関 widget で day 再集計 / dateKey 手生成を行わない (baseline 0)', () => {
    const violations: string[] = []
    for (const relPath of WATCHED_FILES) {
      const abs = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(abs)) {
        violations.push(relPath + ': ファイルが存在しない')
        continue
      }
      const content = fs.readFileSync(abs, 'utf-8')
      for (const f of FORBIDDEN_PATTERNS) {
        const matches = content.match(f.pattern)
        if (matches && matches.length > 0) {
          violations.push(relPath + ': ' + f.label + ' (' + matches.length + ' 件)')
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 6 Step D] 天気相関 widget で日次 projection を再実装しようとしています:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. buildDailySalesProjection(rows) を呼ぶだけにする',
            '  2. dateKey は row.dateKey を使い、toDateKeyFromParts は呼ばない',
            '  3. day キー集約は pure helper 側で済ませる',
            '',
            '詳細: app/src/features/weather/application/projections/buildDailySalesProjection.ts',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('WATCHED_FILES の各 entry が実在する (orphan 検出)', () => {
    const missing: string[] = []
    for (const relPath of WATCHED_FILES) {
      const abs = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(abs)) missing.push(relPath)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('WATCHED_FILES が buildDailySalesProjection を import している (使用強制)', () => {
    for (const relPath of WATCHED_FILES) {
      const abs = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      expect(
        content.includes('buildDailySalesProjection'),
        relPath + ': buildDailySalesProjection を import していない',
      ).toBe(true)
    }
  })

  it('buildDailySalesProjection helper ファイルが存在する', () => {
    const helperFile = path.join(
      SRC_DIR,
      'features/weather/application/projections/buildDailySalesProjection.ts',
    )
    expect(fs.existsSync(helperFile)).toBe(true)
    const content = fs.readFileSync(helperFile, 'utf-8')
    expect(content).toContain('export function buildDailySalesProjection')
  })

  it('buildDailySalesProjection の parity test が存在する (意味境界の凍結)', () => {
    const testFile = path.join(
      SRC_DIR,
      'features/weather/application/projections/__tests__/buildDailySalesProjection.parity.test.ts',
    )
    expect(fs.existsSync(testFile)).toBe(true)
  })
})
