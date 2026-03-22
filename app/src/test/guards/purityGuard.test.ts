/**
 * 構造純粋性ガードテスト
 *
 * コード内容ベースの構造制約を機械的に検証する。
 *
 * @guard A2 Domain は純粋（副作用API禁止、async禁止）
 * @guard A3 Presentation は描画専用（SQL埋め込み禁止）
 * @guard A6 load 処理は3段階分離
 * @guard B1 Authoritative 計算は domain/calculations のみ
 * @guard B3 率は domain/calculations で算出
 * @guard C6 facade は orchestration のみ
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

// ─── 3-A: Domain 純粋性ガード ────────────────────────────

describe('Domain 純粋性ガード', () => {
  it('domain/ で副作用 API を使用しない', () => {
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    // 禁止する副作用 API パターン（実際の API 呼び出しのみ検出）
    const SIDE_EFFECT_PATTERNS = [
      /\bfetch\s*\(/, // HTTP fetch
      /\blocalStorage\s*\./, // ローカルストレージ
      /\bindexedDB\s*\./, // IndexedDB
      /\bwindow\.\w/, // window オブジェクト
      /\bdocument\.\w/, // DOM 操作
      /\bsetTimeout\s*\(/, // タイマー
      /\bsetInterval\s*\(/, // インターバル
      /\bMath\.random\s*\(/, // ランダム（非決定的）
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue
        // import type 行は除外
        if (/^\s*import\s+type\b/.test(line)) continue

        const codePart = stripStrings(line)
        for (const pattern of SIDE_EFFECT_PATTERNS) {
          if (pattern.test(codePart)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
            break
          }
        }
      }
    }

    expect(violations, `domain/ に副作用 API が検出されました:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })

  it('domain/calculations/ で async/await を使用しない', () => {
    const calcDir = path.join(SRC_DIR, 'domain/calculations')
    if (!fs.existsSync(calcDir)) return
    const files = collectTsFiles(calcDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue
        if (/\basync\s+(function|const|\()/.test(line) || /\bawait\s+/.test(line)) {
          violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(
      violations,
      `domain/calculations/ に async/await が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 3-B: Presentation 描画専用ガード ──────────────────────

describe('Presentation 描画専用ガード', () => {
  it('presentation/ .tsx で SQL 文字列を埋め込まない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    const SQL_PATTERNS = [
      /\bSELECT\s+.*\bFROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bDROP\s+TABLE\b/i,
      /\bALTER\s+TABLE\b/i,
    ]

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      // DevTools は除外
      if (file.includes('DevTools')) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue

        for (const pattern of SQL_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 80)}`)
            break
          }
        }
      }
    }

    expect(
      violations,
      `presentation/ に SQL 文字列が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 3-C: Engine 境界ガード ──────────────────────────────

describe('Engine 境界ガード', () => {
  it('infrastructure/duckdb/queries/ は domain/calculations/ に依存しない', () => {
    const queriesDir = path.join(SRC_DIR, 'infrastructure/duckdb/queries')
    if (!fs.existsSync(queriesDir)) return
    const files = collectTsFiles(queriesDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/domain/calculations')) {
          violations.push(
            `${rel(file)}: ${imp} — DuckDB クエリは Authoritative Engine に依存できません`,
          )
        }
      }
    }

    expect(violations, `Engine 境界違反が検出されました:\n${violations.join('\n')}`).toEqual([])
  })

  it('*.vm.ts / *Logic.ts に Zustand/immer import がない', () => {
    const dirs = [path.join(SRC_DIR, 'application'), path.join(SRC_DIR, 'presentation')]
    const violations: string[] = []
    const PURE_PATTERNS = [/Logic\.ts$/, /\.vm\.ts$/]

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const basename = path.basename(file)
        if (!PURE_PATTERNS.some((p) => p.test(basename))) continue

        const content = fs.readFileSync(file, 'utf-8')
        if (/import\s.*from\s+['"]zustand['"]/.test(content)) {
          violations.push(`${rel(file)}: zustand import が含まれています`)
        }
        if (/import\s.*from\s+['"]immer['"]/.test(content)) {
          violations.push(`${rel(file)}: immer import が含まれています`)
        }
      }
    }

    expect(violations, `VM/Logic に state 管理 import:\n${violations.join('\n')}`).toEqual([])
  })

  it('application/usecases/ に React hook import がない', () => {
    const usecasesDir = path.join(SRC_DIR, 'application/usecases')
    if (!fs.existsSync(usecasesDir)) return
    const files = collectTsFiles(usecasesDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // React hook の import を検出
      if (
        /import\s+\{[^}]*(useState|useEffect|useMemo|useCallback|useRef)[^}]*\}\s+from\s+['"]react['"]/.test(
          content,
        )
      ) {
        violations.push(`${rel(file)}: React hook import が含まれています`)
      }
    }

    expect(violations, `usecases/ に React hook import:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── 3-D: 率の再計算禁止ガード（禁止事項 #10）───────────────

describe('率の再計算禁止ガード', () => {
  it('presentation/ .tsx で率を直接計算しない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // 業務指標の直接除算パターン
    // sales / customers, profit / sales, cost / total 等
    const RATE_PATTERNS = [
      /\b(?:sales|profit|cost|amount)\s*\/\s*(?:customers|sales|count|total)\b/i,
    ]

    for (const file of files) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue
      // .vm.ts は domain/calculations に委譲する場所なので除外
      if (file.endsWith('.vm.ts')) continue
      // テストファイルは除外
      if (file.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue

        for (const pattern of RATE_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 80)}`)
            break
          }
        }
      }
    }

    expect(
      violations,
      `presentation/ で率の直接計算が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 3-E: facade/hook 責務混在検出ガード ──────────────────

describe('facade/hook 責務混在ガード', () => {
  it('facade ファイルで map/filter/reduce を多用しない', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // facade / ファサード をコメントで宣言しているファイルのみ対象
      if (!content.includes('facade') && !content.includes('ファサード')) continue

      const lines = content.split('\n')
      let dataTransformCount = 0
      for (const line of lines) {
        if (isCommentLine(line)) continue
        if (/\.map\s*\(/.test(line)) dataTransformCount++
        if (/\.filter\s*\(/.test(line)) dataTransformCount++
        if (/\.reduce\s*\(/.test(line)) dataTransformCount++
      }

      if (dataTransformCount >= 5) {
        violations.push(
          `${rel(file)}: データ変換 ${dataTransformCount}回 (上限: 5) — facade にデータ変換が混入`,
        )
      }
    }

    expect(violations, `facade にデータ変換が混入しています:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── 3-F: 許可リスト増加防止ガード ───────────────────────

describe('許可リスト増加防止ガード', () => {
  it('domain/ の 300行超除外ファイルは増やさない', () => {
    // hookComplexityGuard.test.ts の domain 除外リストのファイル数上限
    // 現在 7 件（metricDefs, metricResolver, PeriodSelection, rawAggregation,
    //   ComparisonScope, advancedForecast, formulaRegistryBusiness）
    // 増加には architecture ロールの承認が必要
    const MAX_DOMAIN_EXCLUSIONS = 7
    // テストファイル自身から除外リストサイズを読み取ることは困難なため、
    // domain/ で 300行超のファイル数が上限以下であることを直接検証する
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    let largeFileCount = 0

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 300) {
        largeFileCount++
      }
    }

    expect(
      largeFileCount,
      `domain/ の 300行超ファイルが ${largeFileCount} 件（上限: ${MAX_DOMAIN_EXCLUSIONS}）`,
    ).toBeLessThanOrEqual(MAX_DOMAIN_EXCLUSIONS)
  })

  it('infrastructure/ の 400行超除外ファイルは増やさない', () => {
    const MAX_INFRA_EXCLUSIONS = 5
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    let largeFileCount = 0

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        largeFileCount++
      }
    }

    expect(
      largeFileCount,
      `infrastructure/ の 400行超ファイルが ${largeFileCount} 件（上限: ${MAX_INFRA_EXCLUSIONS}）`,
    ).toBeLessThanOrEqual(MAX_INFRA_EXCLUSIONS)
  })
})
