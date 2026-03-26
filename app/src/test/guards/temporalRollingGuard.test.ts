/**
 * Temporal Rolling Path ガードテスト
 *
 * rolling 実装経路を強制し、UI / hook / comparison への逆流を防ぐ。
 * 既存 layerBoundaryGuard / presentationIsolationGuard と同じスタイル。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  SRC_DIR,
  collectTsFiles,
  rel,
  extractImports,
  isCommentLine,
  stripStrings,
} from '../guardTestHelpers'

// ── R-T1: presentation/ で computeMovingAverage を import しない ──

describe('R-T1: presentation/ で rolling 計算を import しない', () => {
  it('presentation/ が computeMovingAverage を import しない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.includes('computeMovingAverage') || imp.includes('computeRollingSum')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `presentation/ が rolling 計算を直接 import しています:\n${violations.join('\n')}\n` +
        '→ rolling 計算は QueryHandler 経由で実行してください。',
    ).toEqual([])
  })
})

// ── R-T2: application/hooks/ で rolling 計算を直接 import しない ──

describe('R-T2: application/hooks/ で rolling 計算を直接 import しない', () => {
  it('application/hooks/ が computeMovingAverage を直接 import しない', () => {
    const hooksDir = path.join(SRC_DIR, 'application/hooks')
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.includes('computeMovingAverage') || imp.includes('computeRollingSum')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `application/hooks/ が rolling 計算を直接 import しています:\n${violations.join('\n')}\n` +
        '→ rolling 計算は handler 内で実行し、hook は useQueryWithHandler 経由で呼んでください。',
    ).toEqual([])
  })
})

// ── R-T3: temporal/ 以外で buildDailySeries + rolling 計算を組み合わせない ──

describe('R-T3: rolling 実行経路は temporal handler 内に閉じる', () => {
  it('application/queries/temporal/ 以外で buildDailySeries と rolling 計算を同時 import しない', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    const ROLLING_FUNCTIONS = ['computeMovingAverage', 'computeRollingSum']
    const SERIES_BUILDER = 'buildDailySeries'
    const ALLOWED_DIR = 'application/queries/temporal/'

    for (const file of files) {
      const relPath = rel(file)
      if (relPath.startsWith(ALLOWED_DIR)) continue

      const imports = extractImports(file)
      const hasSeriesBuilder = imports.some((imp) => imp.includes(SERIES_BUILDER))
      const hasRolling = imports.some((imp) => ROLLING_FUNCTIONS.some((fn) => imp.includes(fn)))

      if (hasSeriesBuilder && hasRolling) {
        violations.push(
          `${relPath}: buildDailySeries + rolling 計算の同居（handler 外での rolling 実行）`,
        )
      }
    }

    expect(
      violations,
      `temporal handler 外で rolling 実行経路が検出されました:\n${violations.join('\n')}\n` +
        '→ rolling 計算は application/queries/temporal/ の handler 内で閉じてください。',
    ).toEqual([])
  })
})

// ── R-T4: presentation/ で windowSize を使った手書き平均計算を禁止 ──

describe('R-T4: presentation/ で rolling 平均の手書き実装を禁止', () => {
  it('presentation/ で windowSize + reduce/slice を使った平均計算パターンがない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // windowSize と reduce を使った平均計算パターンを検出
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      let hasWindowSize = false
      let hasReduceAvg = false

      for (const line of lines) {
        if (isCommentLine(line)) continue
        const stripped = stripStrings(line)
        if (/windowSize/i.test(stripped)) hasWindowSize = true
        if (/\.reduce\(.*\//.test(stripped) || /\.slice\(.*\.reduce\(/.test(stripped)) {
          hasReduceAvg = true
        }
      }

      if (hasWindowSize && hasReduceAvg) {
        violations.push(
          `${rel(file)}: windowSize + reduce/slice パターン（rolling 平均の手書き実装疑い）`,
        )
      }
    }

    expect(
      violations,
      `presentation/ で rolling 平均の手書き実装が検出されました:\n${violations.join('\n')}\n` +
        '→ rolling 計算は useTemporalAnalysis 経由で取得してください。',
    ).toEqual([])
  })
})

// ── R-T5: useUnifiedWidgetContext が temporal rolling を import しない ──

describe('R-T5: useUnifiedWidgetContext が temporal rolling を import しない', () => {
  it('useUnifiedWidgetContext が temporal/rolling 関連を import しない', () => {
    const file = path.join(SRC_DIR, 'presentation/hooks/useUnifiedWidgetContext.ts')
    if (!fs.existsSync(file)) return

    const imports = extractImports(file)
    const violations = imports.filter(
      (imp) =>
        imp.includes('computeMovingAverage') ||
        imp.includes('MovingAverageHandler') ||
        imp.includes('useTemporalAnalysis') ||
        imp.includes('buildTemporalFetchPlan') ||
        imp.includes('buildDailySeries'),
    )

    expect(
      violations,
      `useUnifiedWidgetContext が temporal rolling を import しています:\n${violations.join('\n')}\n` +
        '→ temporal analysis は useTemporalAnalysis 経由の独立入口を使用してください。',
    ).toEqual([])
  })
})

// ── R-T6: comparison/ が temporal rolling を import しない ──

describe('R-T6: comparison/ が temporal rolling を import しない', () => {
  it('application/comparison/ が temporal rolling 実装を import しない', () => {
    const compDir = path.join(SRC_DIR, 'application/comparison')
    if (!fs.existsSync(compDir)) return

    const files = collectTsFiles(compDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (
          imp.includes('computeMovingAverage') ||
          imp.includes('MovingAverageHandler') ||
          imp.includes('buildDailySeries') ||
          imp.includes('buildTemporalFetchPlan')
        ) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `comparison/ が temporal rolling を import しています:\n${violations.join('\n')}\n` +
        '→ comparison path と temporal rolling path は独立に保ってください。',
    ).toEqual([])
  })
})
