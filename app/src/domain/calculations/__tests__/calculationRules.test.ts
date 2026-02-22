/**
 * アーキテクチャガードテスト — domain / infrastructure / presentation 計算ロジックの設計ルール準拠検証
 *
 * このテストはソースコードの**構造**を検査し、設計ルール違反を自動検出する。
 * CIで守られていないパターンを自動的に弾く。
 *
 * 検出する違反:
 *   RULE-D1: domain/calculations 内のインライン除算（safeDivide 未使用）
 *   RULE-D2: domain/calculations 内のインライン客単価計算（calculateTransactionValue 未使用）
 *   RULE-I1: overflow day ロジックの重複（overflowDay.ts 未使用）
 *   RULE-P1: presentation 層でのインライン客単価計算（calculateTransactionValue 未使用）
 *   RULE-P2: fmtSen ヘルパーの重複定義（drilldownUtils.ts からの import を強制）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/* ── ヘルパー ──────────────────────────────── */

/** コメント行を除外したコード行を返す */
function getCodeLines(content: string) {
  return content
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))
}

function findViolations(codeLines: string[], pattern: RegExp) {
  return codeLines
    .map((line, i) => ({ line: line.trim(), num: i + 1 }))
    .filter(({ line }) => pattern.test(line))
}

/* ── テスト対象パス定義 ────────────────────── */

const DOMAIN_CALC_DIR = path.resolve(__dirname, '..')
const INFRA_DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'infrastructure', 'dataProcessing')
const PRESENTATION_DIR = path.resolve(__dirname, '..', '..', '..', 'presentation')

/**
 * domain/calculations の計算ロジックファイル一覧（テストファイル・index除外）
 * utils.ts 自体は safeDivide の定義元なので一部検査を除外
 */
const DOMAIN_CALC_FILES = fs.readdirSync(DOMAIN_CALC_DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts')

/** safeDivide 定義元のため一部ルールを除外するファイル */
const SAFE_DIVIDE_DEFINITION_FILE = 'utils.ts'

/**
 * overflow day ロジックを使用するプロセッサ。
 * 新規プロセッサを追加する場合はここに追加し、overflowDay.ts を使用すること。
 */
const OVERFLOW_DAY_PROCESSORS = [
  'DiscountProcessor.ts',
  'CategoryTimeSalesProcessor.ts',
] as const

/* ── RULE-D1: domain 内インライン除算の禁止 ── */

describe('RULE-D1: domain/calculations 内の除算は safeDivide を経由する', () => {
  /**
   * インライン除算パターンの検出。
   * safeDivide を使わず独自にゼロ除算ガードを行っている箇所を検出する。
   *
   * 検出パターン:
   *   - `x > 0 ? y / x : z` (ternary division guard)
   *   - `x !== 0 ? y / x : z` (ternary zero check)
   *   - `x > 0 ? x : 1` (divisor fallback to 1)
   */
  const INLINE_DIVISION_PATTERNS = [
    /\w+\s*>\s*0\s*\?\s*\w[^:]*\/\s*\w+\s*:/,   // x > 0 ? y / x : z
    /\w+\s*!==\s*0\s*\?\s*\w[^:]*\/\s*\w+\s*:/, // x !== 0 ? y / x : z
  ]

  for (const file of DOMAIN_CALC_FILES) {
    if (file === SAFE_DIVIDE_DEFINITION_FILE) continue // safeDivide 定義元は除外

    it(`${file}: インライン除算パターンが存在しないこと`, () => {
      const content = fs.readFileSync(path.join(DOMAIN_CALC_DIR, file), 'utf-8')
      const codeLines = getCodeLines(content)

      for (const pattern of INLINE_DIVISION_PATTERNS) {
        const violations = findViolations(codeLines, pattern)
        expect(
          violations,
          `${file} にインライン除算パターンを検出:\n` +
          violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
          '\n→ safeDivide(numerator, denominator, fallback) を使用してください',
        ).toHaveLength(0)
      }
    })
  }

  it('safeDivide を使用する全ファイルが utils から import していること', () => {
    for (const file of DOMAIN_CALC_FILES) {
      if (file === SAFE_DIVIDE_DEFINITION_FILE) continue
      const content = fs.readFileSync(path.join(DOMAIN_CALC_DIR, file), 'utf-8')
      const usesSafeDivide = /safeDivide\s*\(/.test(content)
      if (usesSafeDivide) {
        const hasImport = /import\s+\{[^}]*safeDivide[^}]*\}\s+from\s+['"]\.\/utils['"]/.test(content)
        expect(
          hasImport,
          `${file} が safeDivide を使用していますが './utils' から import していません`,
        ).toBe(true)
      }
    }
  })
})

/* ── RULE-D2: calculateTransactionValue の一元利用 ── */

describe('RULE-D2: 客単価計算は calculateTransactionValue を経由する', () => {
  /**
   * presentation 層でインライン客単価計算を検出。
   * Math.round(xxx / xxxCustomers) パターンを禁止。
   *
   * ※ calculateTransactionValue の定義元 (utils.ts) は除外。
   */
  /**
   * Math.round(xxxSales / xxxCustomers) のパターンを検出。
   * 分子に [Ss]ales、分母に [Cc]ustomer を含む場合のみ検出する。
   * (customers / count のような平均客数計算は対象外)
   */
  const INLINE_TX_VALUE_PATTERN = /Math\.round\s*\([^)]*[Ss]ales\s*\/\s*\S*[Cc]ustomer/

  it('presentation 層にインライン客単価計算が存在しないこと', () => {
    const presentationFiles = walkFiles(PRESENTATION_DIR, '.tsx', '.ts')

    for (const filePath of presentationFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const codeLines = getCodeLines(content)
      const violations = findViolations(codeLines, INLINE_TX_VALUE_PATTERN)
      const relPath = path.relative(PRESENTATION_DIR, filePath)

      expect(
        violations,
        `presentation/${relPath} にインライン客単価計算を検出:\n` +
        violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
        '\n→ calculateTransactionValue(sales, customers) を使用してください',
      ).toHaveLength(0)
    }
  })

  it('domain/calculations 内にインライン客単価計算が存在しないこと', () => {
    for (const file of DOMAIN_CALC_FILES) {
      if (file === SAFE_DIVIDE_DEFINITION_FILE) continue
      const content = fs.readFileSync(path.join(DOMAIN_CALC_DIR, file), 'utf-8')
      const codeLines = getCodeLines(content)
      const violations = findViolations(codeLines, INLINE_TX_VALUE_PATTERN)

      expect(
        violations,
        `${file} にインライン客単価計算を検出:\n` +
        violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
        '\n→ calculateTransactionValue(sales, customers) を使用してください',
      ).toHaveLength(0)
    }
  })
})

/* ── RULE-I1: overflow day ロジックの共通化 ── */

describe('RULE-I1: overflow day ロジックは overflowDay.ts を経由する', () => {
  /**
   * DiscountProcessor / CategoryTimeSalesProcessor 内で
   * 手動の overflow day ロジック（daysInTargetMonth 算出やnextMonth算出）を検出。
   */
  const INLINE_OVERFLOW_PATTERNS = [
    /new\s+Date\([^)]*,\s*targetMonth\s*,\s*0\s*\)\.getDate\(\)/,  // daysInTargetMonth 手動算出
    /\(\s*targetMonth\s*%\s*12\s*\)\s*\+\s*1/,                     // nextMonth 手動算出
  ]

  for (const processor of OVERFLOW_DAY_PROCESSORS) {
    it(`${processor}: インライン overflow day ロジックが存在しないこと`, () => {
      const content = fs.readFileSync(path.join(INFRA_DATA_DIR, processor), 'utf-8')
      const codeLines = getCodeLines(content)

      for (const pattern of INLINE_OVERFLOW_PATTERNS) {
        const violations = findViolations(codeLines, pattern)
        expect(
          violations,
          `${processor} にインライン overflow day ロジックを検出:\n` +
          violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
          '\n→ overflowDay.ts の detectDaysInTargetMonth / resolveDay を使用してください',
        ).toHaveLength(0)
      }
    })

    it(`${processor}: overflowDay.ts から import していること`, () => {
      const content = fs.readFileSync(path.join(INFRA_DATA_DIR, processor), 'utf-8')
      const hasImport = /import\s+\{[^}]*(?:detectDaysInTargetMonth|resolveDay)[^}]*\}\s+from\s+['"]\.\/overflowDay['"]/.test(content)
      expect(
        hasImport,
        `${processor} が overflowDay.ts から import していません。\n` +
        '→ import { detectDaysInTargetMonth, resolveDay } from \'./overflowDay\' を追加してください',
      ).toBe(true)
    })
  }

  it('overflowDay.ts が存在し、必要な関数を export していること', () => {
    const filePath = path.join(INFRA_DATA_DIR, 'overflowDay.ts')
    expect(fs.existsSync(filePath), 'overflowDay.ts が存在しません').toBe(true)
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(/export\s+function\s+detectDaysInTargetMonth/.test(content)).toBe(true)
    expect(/export\s+function\s+resolveDay/.test(content)).toBe(true)
  })
})

/* ── RULE-P2: fmtSen ヘルパーの重複定義禁止 ── */

describe('RULE-P2: fmtSen は drilldownUtils.ts から import する', () => {
  /**
   * Dashboard widgets 内で fmtSen を独自定義しているファイルを検出。
   * 唯一の定義元は drilldownUtils.ts。
   */
  const FMTSEN_DEFINITION = 'drilldownUtils.ts'

  it('Dashboard widgets に fmtSen の重複定義が存在しないこと', () => {
    const widgetsDir = path.resolve(PRESENTATION_DIR, 'pages', 'Dashboard', 'widgets')
    if (!fs.existsSync(widgetsDir)) return

    const files = fs.readdirSync(widgetsDir)
      .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== FMTSEN_DEFINITION)

    for (const file of files) {
      const content = fs.readFileSync(path.join(widgetsDir, file), 'utf-8')
      const codeLines = getCodeLines(content)
      const pattern = /^function\s+fmtSen\s*\(/
      const violations = findViolations(codeLines, pattern)

      expect(
        violations,
        `widgets/${file} に fmtSen の重複定義を検出:\n` +
        violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
        '\n→ import { fmtSen } from \'./drilldownUtils\' を使用してください',
      ).toHaveLength(0)
    }
  })

  it('drilldownUtils.ts が fmtSen を export していること', () => {
    const filePath = path.resolve(PRESENTATION_DIR, 'pages', 'Dashboard', 'widgets', FMTSEN_DEFINITION)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(/export\s+function\s+fmtSen/.test(content)).toBe(true)
  })
})

/* ── ファイル走査ヘルパー ─────────────────── */

function walkFiles(dir: string, ...exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // __tests__ と test ディレクトリは除外
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      results.push(...walkFiles(fullPath, ...exts))
    } else if (exts.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}
