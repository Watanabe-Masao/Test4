// Chart Input Builder Pattern Guard
//
// unify-period-analysis Phase 5: chart / widget から「query input を
// 組み立てる責務」を剥がし、application 層の pure builder に集約する
// 設計パターンを機械的に強制する。
//
// 守る invariant:
//
// G5-CIB-1: presentation/components/charts/ 配下で dateRangeToKeys を
//   直接 import / 呼び出さない
//   - 理由: chart は「入力 → 描画」のみ。query input の日付変換は
//     application 層の pure builder (build<Name>Input.ts) に集約する
//   - 違反したら chart に「query input 組み立て責務」が混入しているサイン
//   - allowlist: Phase 5 開始時点の 7 件。以後 ratchet-down のみ許可
//
// 本 guard は既存の次の guard と補完関係にある:
//   - comparisonResolvedRangeSurfaceGuard: scope 内部フィールド参照禁止
//   - presentationPeriodStoreAccessGuard: periodSelectionStore 直接禁止
//   - presentationComparisonMathGuard: 比較先日付独自計算禁止
//
// これらが chart の「読む責務」を封じているのに対し、本 guard は
// 「query input を作る責務」を封じる。両者合わせて chart 薄化を強制する。
//
// 見本実装: YoYChart.tsx + buildYoyDailyInput.ts
// 詳細: references/03-guides/chart-input-builder-pattern.md

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')
const CHARTS_DIR = path.join(SRC_DIR, 'presentation/components/charts')

// Phase 5 開始時点で dateRangeToKeys を chart 配下で直接呼んでいるファイル群。
// 新規追加は禁止。移行完了した順に allowlist から削除し、baseline を下げていく。
//
// ratchet-down ゴール: 全 chart が build<Name>Input.ts 経由になり、
// allowlist が空 (baseline 0) になること。
const ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: 'presentation/components/charts/CumulativeChart.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/DowPatternChart.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/FactorDecompositionPanel.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/FeatureChart.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/StoreHourlyChart.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/WeatherAnalysisPanel.tsx',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/useCategoryHierarchyData.ts',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart hook 内で直接呼んでいる',
  },
  {
    path: 'presentation/components/charts/useDeptHourlyChartData.ts',
    reason: 'Phase 5 移行待ち: dateRangeToKeys を chart hook 内で直接呼んでいる',
  },
]

const ALLOWLIST_PATHS = new Set(ALLOWLIST.map((e) => e.path))

// 検出パターン: dateRangeToKeys の import または関数呼び出し
const FORBIDDEN_PATTERNS: readonly RegExp[] = [/\bdateRangeToKeys\s*\(/]

function isExcludedFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  if (relPath.endsWith('.stories.ts') || relPath.endsWith('.stories.tsx')) return true
  return false
}

function isCommentLine(line: string): boolean {
  const t = line.trimStart()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

describe('Chart Input Builder Pattern Guard (unify-period-analysis Phase 5)', () => {
  it('G5-CIB-1: presentation/components/charts/ 配下で dateRangeToKeys を直接呼ばない (allowlist 以外)', () => {
    if (!fs.existsSync(CHARTS_DIR)) {
      throw new Error('charts dir not found: ' + CHARTS_DIR)
    }
    const chartFiles = collectTsFiles(CHARTS_DIR)
    const violations: string[] = []

    for (const file of chartFiles) {
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
            violations.push(relPath + ':' + (i + 1) + ' ' + line.trim().slice(0, 100))
            break
          }
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 5] presentation/components/charts/ 配下で dateRangeToKeys を直接呼んでいます:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法 (Chart Input Builder Pattern):',
            '  1. application/hooks/plans/build<Name>Input.ts に pure builder を作る',
            '  2. chart は builder を useMemo で呼ぶだけにする',
            '  3. dateRangeToKeys 呼び出しは builder 内に移す',
            '  4. 詳細: references/03-guides/chart-input-builder-pattern.md',
            '  5. 見本実装: buildYoyDailyInput.ts + YoYChart.tsx',
            '',
            'どうしても移行できない正当理由があれば ALLOWLIST に reason を添えて追加。',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('ALLOWLIST baseline: 8 件以下 (ratchet-down)', () => {
    // Phase 5 開始時点で 8 件。Phase 5 横展開で順次 0 へ縮退させる。
    expect(ALLOWLIST.length).toBeLessThanOrEqual(8)
  })

  it('ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('ALLOWLIST の各 entry が実際に dateRangeToKeys を含む (stale 検出)', () => {
    const noLongerMatching: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const matches = content
        .split('\n')
        .some((line) => !isCommentLine(line) && FORBIDDEN_PATTERNS.some((p) => p.test(line)))
      if (!matches) noLongerMatching.push(entry.path)
    }
    expect(
      noLongerMatching,
      'allowlist に残っているが既に移行済みのファイル (削除推奨): ' + noLongerMatching.join(', '),
    ).toEqual([])
  })

  it('見本実装 buildYoyDailyInput.ts + YoYChart.tsx が整合している', () => {
    // YoYChart.tsx は dateRangeToKeys を直接呼ばない (builder 経由化済み)
    const yoyChart = path.join(CHARTS_DIR, 'YoYChart.tsx')
    expect(fs.existsSync(yoyChart)).toBe(true)
    const content = fs.readFileSync(yoyChart, 'utf-8')
    // dateRangeToKeys を呼ばない
    const hasDirectCall = content
      .split('\n')
      .some((line) => !isCommentLine(line) && /\bdateRangeToKeys\s*\(/.test(line))
    expect(hasDirectCall, 'YoYChart.tsx が dateRangeToKeys を直接呼んでいます (見本崩れ)').toBe(
      false,
    )
    // buildYoyDailyInput を import している
    expect(content).toContain('buildYoyDailyInput')
  })

  it('設計ルール文書 (chart-input-builder-pattern.md) が存在する', () => {
    const docFile = path.resolve(
      SRC_DIR,
      '../../references/03-guides/chart-input-builder-pattern.md',
    )
    expect(fs.existsSync(docFile), 'chart-input-builder-pattern.md が存在しない').toBe(true)
    const content = fs.readFileSync(docFile, 'utf-8')
    // ルールの主要要素が記載されている
    expect(content).toContain('Chart Input Builder Pattern')
    expect(content).toContain('buildYoyDailyInput')
    expect(content).toContain('dateRangeToKeys')
  })
})
