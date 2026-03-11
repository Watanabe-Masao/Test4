/**
 * フック複雑度ガードテスト
 *
 * 過剰複雑性の10ルール（R1-R3, R6-R7, R10）を機械的に検証する。
 * architectureGuard.test.ts と同じパターンでソースコードを静的解析する。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '..')

// ─── ヘルパー ───────────────────────────────────────────

/** 指定ディレクトリ以下の全 .ts/.tsx ファイルを再帰的に収集する（テストファイル除外） */
function collectTsFiles(dir: string, excludeTests = true): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__')
        continue
      results.push(...collectTsFiles(fullPath, excludeTests))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      if (excludeTests && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')))
        continue
      results.push(fullPath)
    }
  }
  return results
}

/** テストファイルを収集 */
function collectTestFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      results.push(...collectTestFiles(fullPath))
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}

/** SRC_DIR からの相対パスを返す */
function rel(filePath: string): string {
  return path.relative(SRC_DIR, filePath)
}

// ─── R3: @internal export 禁止 ──────────────────────────

describe('R3: hooks/ に @internal export がない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('@internal コメント付き export が存在しない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@internal')) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(violations, `@internal export が検出されました:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R3 補完: typeof テスト禁止 ─────────────────────────

describe('R3: テストに typeof === "function" アサーションがない', () => {
  const hooksTestDir = path.join(SRC_DIR, 'application/hooks')

  it('typeof === "function" パターンのアサーションが存在しない', () => {
    const testFiles = collectTestFiles(hooksTestDir)
    const violations: string[] = []

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (/typeof\s+\w+.*===?\s*['"]function['"]/.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `typeof === 'function' テストが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R7: store action に業務ロジック（算術式）を埋め込まない ──

describe('R7: stores/ の set() コールバック内に算術式がない', () => {
  const storesDir = path.join(SRC_DIR, 'application/stores')

  it('set() コールバック内の算術代入が存在しない', () => {
    const files = collectTsFiles(storesDir)
    const violations: string[] = []

    // 算術代入パターン: something = expr + expr, expr - expr, expr * expr
    // ただし ?? 0, || 0, += のみの累積、Map/Set 操作は許可
    const arithmeticAssignPattern = /\w+\s*=\s*\([^)]*\)\s*[+\-*/]\s*\([^)]*\)/

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')

      // set() コールバック内のコードを検出
      // 簡易的: set( の後の (state) => { ... } ブロック内を検査
      const lines = content.split('\n')
      let inSetCallback = false
      let braceDepth = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (/\bset\s*\(\s*$/.test(line) || /\bset\s*\(\s*\(state\)/.test(line)) {
          inSetCallback = true
          braceDepth = 0
        }

        if (inSetCallback) {
          braceDepth += (line.match(/{/g) || []).length
          braceDepth -= (line.match(/}/g) || []).length

          // 算術代入を検出（??0, ||0 は除外）
          if (arithmeticAssignPattern.test(line) && !line.includes('??') && !line.includes('||')) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }

          if (braceDepth <= 0 && line.includes(')')) {
            inSetCallback = false
          }
        }
      }
    }

    expect(
      violations,
      `store action 内の算術式が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R1/R4: 分割後ファイルの行数上限 ─────────────────────

describe('R1/R4: 分割後ファイルの行数制限', () => {
  const fileLimits: [string, number][] = [
    // Phase 1: usePurchaseComparisonQuery 分割
    ['application/hooks/duckdb/usePurchaseComparisonQuery.ts', 300],
    ['application/hooks/duckdb/purchaseComparisonBuilders.ts', 600],
    // Phase 2: useAdvancedQueries 分割
    ['application/hooks/duckdb/useAdvancedQueries.ts', 200],
    ['application/hooks/duckdb/categoryBenchmarkLogic.ts', 450],
    ['application/hooks/duckdb/categoryBoxPlotLogic.ts', 250],
    // Phase 7: ImportOrchestrator 分割
    ['application/usecases/import/ImportOrchestrator.ts', 250],
    ['application/usecases/import/singleMonthImport.ts', 200],
    ['application/usecases/import/multiMonthImport.ts', 250],
    // Phase 8: renderClipHtml 分割
    ['application/usecases/clipExport/renderClipHtml.ts', 60],
  ]

  it.each(fileLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return // ファイルが存在しない場合はスキップ
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount, `${relPath} は ${lineCount} 行 (上限: ${maxLines})`).toBeLessThanOrEqual(
      maxLines,
    )
  })
})

// ─── R1: 分離した純粋関数モジュールに React import がない ──

describe('R1: 純粋関数モジュールに React import がない', () => {
  const pureModules = [
    'application/hooks/duckdb/purchaseComparisonBuilders.ts',
    'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    'application/hooks/duckdb/categoryBoxPlotLogic.ts',
    'application/usecases/import/singleMonthImport.ts',
    'application/usecases/import/multiMonthImport.ts',
    'application/usecases/import/importHelpers.ts',
    'application/usecases/clipExport/clipCss.ts',
    'application/usecases/clipExport/clipJs.ts',
  ]

  it.each(pureModules)('%s に React import がない', (relPath) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content, `${relPath} に React import が含まれています`).not.toMatch(
      /import\s.*from\s+['"]react['"]/,
    )
  })
})

// ─── R1: hook ファイルに build* 関数定義が残っていない ────

describe('R1: hook ファイルに抽出済み build* 関数が残っていない', () => {
  const hookFiles = [
    'application/hooks/duckdb/usePurchaseComparisonQuery.ts',
    'application/hooks/duckdb/useAdvancedQueries.ts',
  ]

  it.each(hookFiles)('%s に build*/compute* 関数定義がない', (relPath) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const violations: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 関数定義を検出（re-export は許可）
      if (
        /^(export\s+)?function\s+(build|compute)\w+/.test(line.trim()) &&
        !line.includes('re-export')
      ) {
        violations.push(`${relPath}:${i + 1}: ${line.trim()}`)
      }
    }

    expect(violations, `抽出済み関数が残っています:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R10: カバレッジ目的の export 禁止 ──────────────────

describe('R10: hooks/ の export にカバレッジ目的のコメントがない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('カバレッジ・coverage を理由とする export コメントが存在しない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase()
        if (
          (line.includes('coverage') || line.includes('カバレッジ')) &&
          (line.includes('export') || line.includes('テスト用'))
        ) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `カバレッジ目的の export が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
