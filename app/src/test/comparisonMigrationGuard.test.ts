/**
 * 比較サブシステム移行ガードテスト
 *
 * 旧 day/offset パターンの再発を CI で検出・禁止する。
 * architectureGuard.test.ts / hookComplexityGuard.test.ts と同じ静的解析パターン。
 *
 * ## 背景
 *
 * V2 比較サブシステム（ComparisonScope.alignmentMap + resolveComparisonRows）への
 * 移行中に、旧パターンの新規使用を防ぐ。既存の違反は許可リストで凍結し、
 * 許可リストサイズの増加を禁止する。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '..')

// ─── ヘルパー ───────────────────────────────────────────

/** 指定ディレクトリ以下の全 .ts/.tsx ファイルを再帰的に収集する（テストファイル除外） */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__')
        continue
      results.push(...collectTsFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
      results.push(fullPath)
    }
  }
  return results
}

/** SRC_DIR からの相対パスを返す */
function rel(filePath: string): string {
  return path.relative(SRC_DIR, filePath)
}

// ─── INV-CMP-01: prevYear.daily.get(day) 禁止 ──────────

describe('INV-CMP-01: prevYear.daily.get(day) の新規使用禁止', () => {
  /**
   * 既存の違反ファイル許可リスト（凍結）。
   * 移行完了時に許可リストから削除する。新規追加は禁止。
   */
  const ALLOWLIST = new Set([
    'presentation/pages/Daily/DailyPage.tsx',
    'presentation/pages/Dashboard/widgets/AlertPanel.tsx',
    'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    'presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts',
    'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    'presentation/pages/Dashboard/widgets/SalesAnalysisWidgets.tsx',
    'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    'presentation/pages/Insight/InsightTabBudget.tsx',
    'presentation/pages/Forecast/ForecastPage.helpers.ts',
    'application/hooks/useBudgetChartData.ts',
    'application/usecases/clipExport/buildClipBundle.ts',
  ])
  const MAX_ALLOWLIST_SIZE = 11

  it('許可リストのサイズが上限を超えない', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています（現在 ${ALLOWLIST.size}）。` +
        '新規ファイルで prevYear.daily.get() を使わないでください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('許可リスト外で prevYear.daily.get() を使用していない', () => {
    const targetDirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'application/hooks'),
      path.join(SRC_DIR, 'application/usecases'),
    ]
    const violations: string[] = []
    const pattern = /prevYear\.daily\.get\(/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const relPath = rel(file)
        if (ALLOWLIST.has(relPath)) continue

        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `prevYear.daily.get() が許可リスト外で検出されました:\n${violations.join('\n')}\n` +
        'V2 では resolved comparison row または alignmentMap ベースの集計を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-02: origDay - offset パターン禁止 ──────────

describe('INV-CMP-02: day 番号 + offset による前年比較禁止', () => {
  it('origDay - offset / origDay + offset パターンが存在しない', () => {
    const targetDirs = [path.join(SRC_DIR, 'presentation'), path.join(SRC_DIR, 'application/hooks')]
    const violations: string[] = []
    const pattern = /origDay\s*[-+]\s*offset/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `origDay - offset パターンが検出されました:\n${violations.join('\n')}\n` +
        'V2 では ComparisonScope.alignmentMap を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-03: comparisonFrame.previous 新規使用禁止 ──

describe('INV-CMP-03: comparisonFrame.previous の新規使用禁止', () => {
  /**
   * 既存の違反ファイル許可リスト（凍結）。
   * ComparisonScope ベースに移行完了時に削除する。
   */
  const ALLOWLIST = new Set([
    'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    'presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts',
    'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
  ])
  const MAX_ALLOWLIST_SIZE = 4

  it('許可リストのサイズが上限を超えない', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています（現在 ${ALLOWLIST.size}）。` +
        '新規ファイルで comparisonFrame.previous を使わないでください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('許可リスト外で comparisonFrame.previous を使用していない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []
    const pattern = /comparisonFrame\.previous/

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWLIST.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `comparisonFrame.previous が許可リスト外で検出されました:\n${violations.join('\n')}\n` +
        'V2 では ComparisonScope.alignmentMap または effectivePeriod2 を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-04: aggregateWithOffset 新規使用禁止 ──────

describe('INV-CMP-04: aggregateWithOffset の新規使用禁止', () => {
  it('aggregateWithOffset が使用されていない', () => {
    const targetDirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'application'),
      path.join(SRC_DIR, 'domain'),
      path.join(SRC_DIR, 'infrastructure'),
    ]
    const violations: string[] = []
    const pattern = /aggregateWithOffset/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `aggregateWithOffset が検出されました:\n${violations.join('\n')}\n` +
        'V2 では aggregateKpiByAlignment を使ってください。',
    ).toEqual([])
  })
})
