/**
 * @responsibility R:unclassified
 */

// Chart Rendering Three-Stage Pattern Guard
//
// unify-period-analysis Phase 5 三段構造: chart component から data builder と
// option builder を剥がし、3 段 (data builder → option builder → chart) に
// 明示的に分離する設計パターンを機械的に強制する。
//
// 守る invariant:
//
// G5-CRT-1: chart component (*.tsx) 内で inline 関数として option builder
//   (function build*Option): EChartsOption を定義しない
//   - 理由: option 構築は *OptionBuilder.ts に分離する
//   - 違反したら chart に option 構築責務が混入しているサイン
//
// G5-CRT-2: chart component (*.tsx) 内で inline 関数として data builder
//   (function build*Data): ... を定義しない
//   - 理由: data 集計・変換は *Logic.ts または *.vm.ts に分離する
//   - 違反したら chart に集計責務が混入しているサイン
//
// 本 guard は chartInputBuilderGuard の描画側版:
//   - chartInputBuilderGuard    → chart が query input を組み立てない
//   - chartRenderingStructureGuard → chart が data / option を組み立てない
// 両者合わせて chart component を「入力 builder + 描画 builder + 状態管理」
// のみに薄化する。
//
// 見本実装:
//   - TimeSlotChart (canonical): .vm.ts + OptionBuilder.ts + View.tsx + .tsx
//   - YoYChart (Phase 5 で揃えた 2 例目): YoYChartLogic.ts + YoYChartOptionBuilder.ts + YoYChart.tsx
//
// 詳細: references/03-guides/chart-rendering-three-stage-pattern.md

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')
const CHARTS_DIR = path.join(SRC_DIR, 'presentation/components/charts')

// Phase 5 三段構造確立時点で inline data/option builder を含む chart。
// 移行完了した順に allowlist から削除し、baseline を下げていく。
//
// ratchet-down 履歴:
//   - Phase 5 三段構造確立時点: 3 件
//   - Phase 5 閉じ込み (本 commit): 3 件 → 0 件
//     (DiscountTrendChart / GrossProfitAmountChart / PrevYearComparisonChart
//     を *Logic.ts に抽出、ChartRenderModel<TPoint> 共通契約に準拠)
//
// ゴール達成: 全 chart が *Logic.ts / *.vm.ts / *OptionBuilder.ts に分離され、
// allowlist は **空 (baseline 0)**。新規追加は原則禁止。新 chart は最初から
// logic / option builder 分離で実装する。
const ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = []

const ALLOWLIST_PATHS = new Set(ALLOWLIST.map((e) => e.path))

// 検出パターン: inline 関数宣言
// - function buildXxxOption(...) : EChartsOption (or not) → option builder 違反
// - function buildXxxData(...)                          → data builder 違反
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\bfunction\s+build[A-Z][A-Za-z0-9]*Option\b\s*\(/,
  /\bfunction\s+build[A-Z][A-Za-z0-9]*Data\b\s*\(/,
]

function isCommentLine(line: string): boolean {
  const t = line.trimStart()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

function collectChartTsxFiles(): readonly string[] {
  if (!fs.existsSync(CHARTS_DIR)) return []
  return fs
    .readdirSync(CHARTS_DIR)
    .filter((name) => name.endsWith('.tsx'))
    .filter((name) => !name.includes('.test.') && !name.includes('.spec.'))
    .map((name) => path.join(CHARTS_DIR, name))
}

describe('Chart Rendering Three-Stage Pattern Guard (unify-period-analysis Phase 5)', () => {
  it('G5-CRT: chart component (*.tsx) 内で inline data/option builder 関数を定義しない (allowlist 以外)', () => {
    const chartFiles = collectChartTsxFiles()
    const violations: string[] = []

    for (const file of chartFiles) {
      const relPath = rel(file)
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
            '[Phase 5] chart component 内で inline data/option builder 関数を定義しています:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法 (Chart Rendering Three-Stage Pattern):',
            '  1. data builder を *Logic.ts または *.vm.ts に移動',
            '  2. option builder を *OptionBuilder.ts に移動',
            '  3. chart .tsx は import して orchestration + 状態管理のみに薄化',
            '  4. 詳細: references/03-guides/chart-rendering-three-stage-pattern.md',
            '  5. 見本実装: TimeSlotChart (.vm.ts + OptionBuilder.ts + View.tsx) / ' +
              'YoYChart (YoYChartLogic.ts + YoYChartOptionBuilder.ts)',
            '',
            'どうしても移行できない正当理由があれば ALLOWLIST に reason を添えて追加。',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('ALLOWLIST baseline: 0 件 (Phase 5 閉じ込み完了、以後 0 固定)', () => {
    // Phase 5 三段構造確立時点で 3 件、本 commit で全て移行完了。
    // 新規 chart は最初から *Logic.ts + *OptionBuilder.ts に分離する形で
    // 実装し、inline builder を定義しない。
    expect(ALLOWLIST.length).toBe(0)
  })

  it('ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('ALLOWLIST の各 entry が実際に inline builder を含む (stale 検出)', () => {
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

  it('見本実装 YoYChart.tsx が inline builder を含まない + OptionBuilder をimport している', () => {
    const yoyChart = path.join(CHARTS_DIR, 'YoYChart.tsx')
    expect(fs.existsSync(yoyChart)).toBe(true)
    const content = fs.readFileSync(yoyChart, 'utf-8')
    // inline builder がない
    const hasInline = content
      .split('\n')
      .some((line) => !isCommentLine(line) && FORBIDDEN_PATTERNS.some((p) => p.test(line)))
    expect(hasInline, 'YoYChart.tsx が inline builder を定義しています (見本崩れ)').toBe(false)
    // YoYChartOptionBuilder / YoYChartLogic を import している
    expect(content).toContain('YoYChartOptionBuilder')
    expect(content).toContain('YoYChartLogic')
  })

  it('見本実装 TimeSlotChart 一式が存在する (canonical three-stage structure)', () => {
    const files = [
      'TimeSlotChart.tsx',
      'TimeSlotChart.vm.ts',
      'TimeSlotChartOptionBuilder.ts',
      'TimeSlotChartView.tsx',
    ]
    const missing = files.filter((f) => !fs.existsSync(path.join(CHARTS_DIR, f)))
    expect(missing, 'TimeSlotChart canonical 構成が欠落: ' + missing.join(', ')).toEqual([])
  })

  it('設計ルール文書 (chart-rendering-three-stage-pattern.md) が存在する', () => {
    const docFile = path.resolve(
      SRC_DIR,
      '../../references/03-guides/chart-rendering-three-stage-pattern.md',
    )
    expect(fs.existsSync(docFile), 'chart-rendering-three-stage-pattern.md が存在しない').toBe(true)
    const content = fs.readFileSync(docFile, 'utf-8')
    expect(content).toContain('Chart Rendering Three-Stage Pattern')
    expect(content).toContain('TimeSlotChart')
    expect(content).toContain('YoYChart')
  })
})
