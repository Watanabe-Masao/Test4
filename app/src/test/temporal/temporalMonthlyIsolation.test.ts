/**
 * Temporal Foundation — Monthly Path 非干渉ガードテスト
 *
 * 月跨ぎ分析基盤（temporal/）が既存の monthly / comparison path に
 * 混入しないことを import パターンで機械的に検証する。
 *
 * Phase 0 で先に「柵」を立て、後続 Phase の実装で boundary を守る。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel, extractImports } from '../guardTestHelpers'

// ── 1. useUnifiedWidgetContext が temporal/ を import しない ──

describe('Temporal Isolation: useUnifiedWidgetContext', () => {
  it('useUnifiedWidgetContext が domain/models/temporal/ を import しない', () => {
    const file = path.join(SRC_DIR, 'presentation/hooks/useUnifiedWidgetContext.ts')
    if (!fs.existsSync(file)) return // ファイルが存在しない場合はスキップ

    const imports = extractImports(file)
    const violations = imports.filter((imp) => imp.includes('temporal'))

    expect(
      violations,
      `useUnifiedWidgetContext が temporal/ を import しています:\n${violations.join('\n')}\n` +
        '→ temporal analysis は useTemporalAnalysis 経由で独立して提供してください。',
    ).toEqual([])
  })
})

// ── 2. useCalculation が temporal/ を import しない ──

describe('Temporal Isolation: Monthly Calculation Path', () => {
  it('application/hooks/useCalculation が temporal/ に依存しない', () => {
    const calcDir = path.join(SRC_DIR, 'application/hooks')
    const calcFiles = collectTsFiles(calcDir).filter(
      (f) => path.basename(f).startsWith('useCalculation') || f.includes('calculation'),
    )
    const violations: string[] = []

    for (const file of calcFiles) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.includes('temporal')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `月次計算 path が temporal/ に依存しています:\n${violations.join('\n')}\n` +
        '→ monthly path と analysis path は非干渉にしてください。',
    ).toEqual([])
  })
})

// ── 3. temporal/ 内のファイルが useUnifiedWidgetContext を import しない ──

describe('Temporal Isolation: Independent Entry Point', () => {
  it('temporal/ ディレクトリのファイルが useUnifiedWidgetContext を import しない', () => {
    const temporalDirs = [
      path.join(SRC_DIR, 'domain/models/temporal'),
      path.join(SRC_DIR, 'domain/calculations/temporal'),
      path.join(SRC_DIR, 'application/usecases/temporal'),
      path.join(SRC_DIR, 'application/queries/temporal'),
      path.join(SRC_DIR, 'application/services/temporal'),
    ]
    const violations: string[] = []

    for (const dir of temporalDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const imports = extractImports(file)
        for (const imp of imports) {
          if (imp.includes('useUnifiedWidgetContext')) {
            violations.push(`${rel(file)}: ${imp}`)
          }
        }
      }
    }

    expect(
      violations,
      `temporal/ が useUnifiedWidgetContext を import しています:\n${violations.join('\n')}\n` +
        '→ temporal analysis は useTemporalAnalysis 経由の独立入口を使用してください。',
    ).toEqual([])
  })
})

// ── 4. domain/models/temporal/ が ComparisonScope / comparison を import しない ──

describe('Temporal Isolation: Comparison Independence', () => {
  it('domain/models/temporal/ が ComparisonScope / comparison を import しない', () => {
    const temporalModelDir = path.join(SRC_DIR, 'domain/models/temporal')
    const files = collectTsFiles(temporalModelDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.includes('ComparisonScope') || imp.includes('comparison')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `domain/models/temporal/ が comparison に依存しています:\n${violations.join('\n')}\n` +
        '→ comparison 正本（ComparisonScope）への依存は Phase 6-7 まで導入しないでください。',
    ).toEqual([])
  })
})

// ── 5. domain/models/temporal/ が periodSelectionStore を import しない ──

describe('Temporal Isolation: Store Independence', () => {
  it('domain/models/temporal/ が store 実装に依存しない', () => {
    const temporalModelDir = path.join(SRC_DIR, 'domain/models/temporal')
    const files = collectTsFiles(temporalModelDir)
    const violations: string[] = []

    // 具体的な store への依存を禁止（Store を含むドメイン型名は許容）
    const FORBIDDEN_STORE_PATTERNS = [
      'periodSelectionStore',
      '/stores/',
      'useDataStore',
      'useSettingsStore',
      'useFilterStore',
      'useUiStore',
    ]

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (FORBIDDEN_STORE_PATTERNS.some((p) => imp.includes(p))) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      `domain/models/temporal/ が store 実装に依存しています:\n${violations.join('\n')}\n` +
        '→ 入力型は store 実装に依存せず、純粋な domain 型として維持してください。',
    ).toEqual([])
  })
})
