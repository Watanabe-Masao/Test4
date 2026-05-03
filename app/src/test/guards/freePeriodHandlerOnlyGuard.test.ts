/**
 * freePeriodHandlerOnly Guard — 自由期間取得経路の唯一性を機械的に保証する
 *
 * unify-period-analysis Phase 3: 自由期間データの取得経路は次の 1 本に
 * 収束しており、他経路の追加を禁止する:
 *
 *   widget / chart
 *     ↓ ctx.freePeriodLane.bundle.fact  (FreePeriodReadModel)
 *   useUnifiedWidgetContext / useFreePeriodAnalysisBundle
 *     ↓ freePeriodHandler (application/queries)
 *     ↓ queryFreePeriodDaily (infrastructure/duckdb/queries/freePeriodFactQueries)
 *
 * ## 本ガードが守る 2 つの invariant
 *
 * ### G3-1: `queryFreePeriodDaily` / `freePeriodFactQueries` の caller 制限
 *
 * `queryFreePeriodDaily` を import してよいのは:
 *   - `application/queries/freePeriodHandler.ts`（唯一の orchestration point）
 *   - テスト / audit ファイル (`__tests__/` / `.test.` / `audits/`)
 *
 * これ以外の層（features / presentation / 他の application hook）から
 * 直接 infra query を呼ぶことを機械的に禁止する。
 *
 * ### G3-2: `FreePeriodDailyRow` の raw row 型を presentation に漏らさない
 *
 * `FreePeriodDailyRow[]` を presentation / chart / VM に渡すのを禁止する。
 * presentation が raw 行配列を消費すると、集計・比較・メタデータの責務が
 * 再分散する。presentation は `FreePeriodReadModel`（= ctx.freePeriodLane.
 * bundle.fact）経由でのみ自由期間データに触れる。
 *
 * @see references/01-foundation/free-period-analysis-definition.md §唯一経路ルール
 * @see references/03-implementation/runtime-data-path.md §自由期間ファクト
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * `queryFreePeriodDaily` / `freePeriodFactQueries` を import してよいファイルの
 * allowlist。ここに含まれないパスから import すると fail する。
 *
 * 新規追加は原則禁止（正当理由が必要）。freePeriodHandler.ts を経由せずに
 * infra query を直接呼ぶのは、取得経路の唯一性を壊すため。
 */
const HANDLER_ONLY_ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: 'application/queries/freePeriodHandler.ts',
    reason: '自由期間取得 orchestration の唯一 caller',
  },
]

const HANDLER_ONLY_ALLOWLIST_PATHS = new Set(HANDLER_ONLY_ALLOWLIST.map((e) => e.path))

/** `queryFreePeriodDaily` / `freePeriodFactQueries` の import を検出するパターン */
const INFRA_QUERY_PATTERNS: readonly RegExp[] = [
  /from\s+['"]@\/infrastructure\/duckdb\/queries\/freePeriodFactQueries['"]/,
  /\bqueryFreePeriodDaily\b/,
]

/** `FreePeriodDailyRow` type import を検出するパターン */
const RAW_ROW_TYPE_PATTERNS: readonly RegExp[] = [/\bFreePeriodDailyRow\b/]

function isTestOrAuditFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  if (relPath.startsWith('test/audits/')) return true
  if (relPath.startsWith('test/fixtures/')) return true
  if (relPath.startsWith('test/guards/')) return true
  return false
}

describe('freePeriodHandlerOnly Guard (unify-period-analysis Phase 3)', () => {
  it('G3-1: queryFreePeriodDaily / freePeriodFactQueries の caller は allowlist 内に限定される', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = rel(file)

      // 自分自身（guard テスト）と、テスト/fixture は検査対象外
      if (relPath === 'test/guards/freePeriodHandlerOnlyGuard.test.ts') continue
      if (isTestOrAuditFile(relPath)) continue

      // infra query 自体は当然 import していないのでスキップ
      if (relPath === 'infrastructure/duckdb/queries/freePeriodFactQueries.ts') continue

      if (HANDLER_ONLY_ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of INFRA_QUERY_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relPath}: matched ${pattern}`)
          break
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 3] queryFreePeriodDaily / freePeriodFactQueries の非 allowlist caller が検出:',
            ...violations.map((v) => `  - ${v}`),
            '',
            '解決方法:',
            '  1. freePeriodHandler 経由で自由期間データを取得する',
            '  2. handler なしでは取得できない正当理由があれば HANDLER_ONLY_ALLOWLIST に reason を添えて追加',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('G3-2: FreePeriodDailyRow の型 import は presentation 層では禁止（raw rows 漏出防止）', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (isTestOrAuditFile(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of RAW_ROW_TYPE_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relPath}: matched ${pattern}`)
          break
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 3] FreePeriodDailyRow を presentation 層で直接参照しないでください:',
            ...violations.map((v) => `  - ${v}`),
            '',
            '解決方法:',
            '  1. ctx.freePeriodLane.bundle.fact (FreePeriodReadModel) を消費する',
            '  2. 集計値が必要なら readModel の currentSummary / comparisonSummary を使う',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('HANDLER_ONLY_ALLOWLIST の各 entry が実在ファイルを指している', () => {
    const missing: string[] = []
    for (const entry of HANDLER_ONLY_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, `存在しないファイル: ${missing.join(', ')}`).toEqual([])
  })

  it('HANDLER_ONLY_ALLOWLIST の各 entry が実際に infra query を import している', () => {
    const noLonger: string[] = []
    for (const entry of HANDLER_ONLY_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const hasImport = INFRA_QUERY_PATTERNS.some((p) => p.test(content))
      if (!hasImport) noLonger.push(entry.path)
    }
    expect(
      noLonger,
      `allowlist に載っているが既に infra query を使っていない (削除推奨): ${noLonger.join(', ')}`,
    ).toEqual([])
  })

  it('baseline: allowlist は 1 件で固定 (ratchet-down)', () => {
    // Phase 3 完了時点で freePeriodHandler.ts のみ。これを増やしたい場合は
    // 取得経路の唯一性を崩す判断になるので、明確な justification が必要。
    expect(HANDLER_ONLY_ALLOWLIST.length).toBeLessThanOrEqual(1)
  })

  it('自由期間分析の定義書が存在し、唯一経路ルールを記載している', () => {
    const defFile = path.resolve(
      SRC_DIR,
      '../../references/01-foundation/free-period-analysis-definition.md',
    )
    expect(fs.existsSync(defFile), 'free-period-analysis-definition.md が存在しない').toBe(true)
    const content = fs.readFileSync(defFile, 'utf-8')
    // Phase 3 で追加した「唯一経路ルール」section の存在を確認
    expect(content).toContain('唯一経路ルール')
    expect(content).toContain('freePeriodHandler')
    expect(content).toContain('queryFreePeriodDaily')
  })

  it('runtime-data-path.md に自由期間ファクトの経路が記載されている', () => {
    const docFile = path.resolve(SRC_DIR, '../../references/03-implementation/runtime-data-path.md')
    expect(fs.existsSync(docFile), 'runtime-data-path.md が存在しない').toBe(true)
    const content = fs.readFileSync(docFile, 'utf-8')
    expect(content).toContain('自由期間ファクト')
    expect(content).toContain('FreePeriodReadModel')
    expect(content).toContain('ctx.freePeriodLane')
  })
})
