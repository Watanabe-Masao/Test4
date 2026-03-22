/**
 * Presentation Isolation Guard
 *
 * presentation/ の描画専用原則と CQRS 境界を検証するガードテスト。
 * architectureGuard.test.ts から抽出。
 *
 * @guard A3 Presentation は描画専用
 * @guard B2 JS/SQL 二重実装禁止
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, extractImports, rel as relativePath } from '../guardTestHelpers'
import {
  presentationToInfrastructure,
  presentationDuckdbHook,
  dowCalcOverride,
  buildAllowlistSet,
} from '../allowlists'

// ─── 許可リスト（allowlists.ts から構築） ────────────────

const PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(presentationToInfrastructure)

// ─── テスト ──────────────────────────────────────────────

describe('Presentation Isolation Guard', () => {
  it('presentation/ は getDailyTotalCost を直接使用しない（事前計算済み totalCost を参照すること）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('getDailyTotalCost')) {
        violations.push(
          `${relativePath(file)}: getDailyTotalCost を直接使用。rec.totalCost（事前計算済みフィールド）を使用してください`,
        )
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は domain/calculations/ のビジネス計算関数を直接 import しない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // domain/calculations/utils からのフォーマット・ユーティリティ関数は許可
    // それ以外のモジュール（factorDecomposition, forecast, inventoryCalc, etc.）は禁止
    const PROHIBITED_MODULES = [
      '@/domain/calculations/factorDecomposition',
      '@/domain/calculations/grossProfit',
      '@/domain/calculations/budgetAnalysis',
      '@/domain/calculations/forecast',
      '@/domain/calculations/inventoryCalc',
      '@/domain/calculations/rules/alertSystem',
      '@/domain/calculations/algorithms/correlation',
      '@/domain/calculations/algorithms/trendAnalysis',
      '@/domain/calculations/algorithms/sensitivity',
      '@/domain/calculations/causalChain',
      '@/domain/calculations/pinIntervals',
      '@/domain/calculations/algorithms/advancedForecast',
      '@/domain/calculations/dowGapAnalysis',
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const mod of PROHIBITED_MODULES) {
        // import type は許可（型のみのインポートは実行時依存を生まない）
        const regex = new RegExp(
          `import\\s+(?!type\\s).*?from\\s+['"]${mod.replace('/', '\\/')}['"]`,
        )
        if (regex.test(content)) {
          violations.push(
            `${relativePath(file)}: ${mod} を直接 import。application/hooks 経由を使用してください`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は比較コンテキストの内部モジュールを直接 import しない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // useComparisonContext 経由のみ許可。内部実装への直接依存を禁止。
    const PROHIBITED_COMPARISON_MODULES = [
      '@/application/comparison/comparisonContextFactory',
      '@/application/comparison/ComparisonContext',
      '@/application/hooks/duckdb/useComparisonContextQuery',
      '@/domain/calculations/dowGapAnalysis',
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const mod of PROHIBITED_COMPARISON_MODULES) {
        // import type は許可（型のみ）
        const regex = new RegExp(
          `import\\s+(?!type\\s).*?from\\s+['"]${mod.replace('/', '\\/')}['"]`,
        )
        if (regex.test(content)) {
          violations.push(
            `${relativePath(file)}: ${mod} を直接 import。useComparisonContext 経由を使用してください`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('storage/ は duckdb/queries/ に依存しない（DuckDB → IndexedDB 書き戻し禁止）', () => {
    const storageDir = path.join(SRC_DIR, 'infrastructure', 'storage')
    if (!fs.existsSync(storageDir)) return
    const files = collectTsFiles(storageDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/duckdb/queries')) {
          violations.push(
            `${relativePath(file)}: ${imp} — DuckDB クエリ結果を IndexedDB に書き戻すことは禁止`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は duckdb/ を直接 import しない（DevTools 除く）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      // DevTools は開発専用。queryProfiler への直接参照を許可
      if (PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/duckdb')) {
          violations.push(
            `${rel}: ${imp} — presentation は DuckDB を直接参照できません。application/hooks 経由を使用してください`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  // ─── CQRS Contract Guards（Phase 2） ──────────────────

  it('application/queries/ は domain/calculations/ に依存しない（Query は Command に依存しない）', () => {
    const queriesDir = path.join(SRC_DIR, 'application', 'queries')
    if (!fs.existsSync(queriesDir)) return
    const files = collectTsFiles(queriesDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/domain/calculations')) {
          violations.push(
            `${relativePath(file)}: ${imp} — Query ハンドラーは Command 側（domain/calculations）に依存できません`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('application/usecases/calculation/ は infrastructure/duckdb/ に依存しない（Command は Query に依存しない）', () => {
    const calcDir = path.join(SRC_DIR, 'application', 'usecases', 'calculation')
    if (!fs.existsSync(calcDir)) return
    const files = collectTsFiles(calcDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/duckdb')) {
          violations.push(
            `${relativePath(file)}: ${imp} — Command ハンドラーは DuckDB に依存できません`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  // ─── Migration Countdown（DuckDB直接参照の段階的廃止）──

  /**
   * Migration Countdown — filterStore 抽象化完了後に廃止予定
   *
   * presentation/ が DuckDB フックを直接使用するファイルの許可リスト。
   * これは正しいアーキテクチャではなく、filterStore + useFilterSelectors への
   * 移行が完了するまでの暫定措置。
   *
   * ルール:
   * - 新規ファイルの追加は禁止（MAX_ALLOWLIST_SIZE = 34 で凍結）
   * - 移行完了したファイルはリストから削除する
   * - リスト増加が必要な場合は architecture ロールの承認が必要
   */
  const PRESENTATION_DUCKDB_HOOK_ALLOWLIST = buildAllowlistSet(presentationDuckdbHook)

  it('presentation/ の新規ファイルは DuckDB フックを直接使用しない（filterStore 経由を使用、import type は許容）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // DuckDB フックの値 import パターン（import type は実行時依存を生まないため除外）
    // サブパス直指定（duckdb/useCts*等）やバレル経由（useDuckDBQuery）も検出する
    const DUCKDB_HOOK_VALUE_PATTERNS = [
      // @/application/hooks/duckdb（バレル）またはサブパス直指定
      /import\s+(?!type\s).*from\s+['"]@\/application\/hooks\/duckdb(?:\/[^'"]*)?['"]/,
      // useDuckDB* を含む名前付き import（任意のパスから）
      /import\s+(?!type\s)\{[^}]*useDuckDB[^}]*\}\s+from\s+['"]@\/application\/hooks[^'"]*['"]/,
      // useDuckDBQuery バレル経由の全 import（type 以外）
      /import\s+(?!type\s).*from\s+['"]@\/application\/hooks\/useDuckDBQuery['"]/,
    ]

    for (const file of files) {
      const rel = path.relative(path.join(SRC_DIR, 'presentation'), file)
      if (PRESENTATION_DUCKDB_HOOK_ALLOWLIST.has(rel)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of DUCKDB_HOOK_VALUE_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(
            `${relativePath(file)}: DuckDB フックを直接使用。filterStore + useFilterSelectors 経由を使用してください`,
          )
          break
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ の DuckDB フック許可リストは増やさない（移行時に減らすのみ）', () => {
    // 許可リストのサイズ上限。移行が進むにつれてこの数値を減らしていく。
    const MAX_ALLOWLIST_SIZE = 31
    expect(PRESENTATION_DUCKDB_HOOK_ALLOWLIST.size).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('DuckDB フック許可リストのファイルが実在する', () => {
    for (const rel of PRESENTATION_DUCKDB_HOOK_ALLOWLIST) {
      const fullPath = path.join(SRC_DIR, 'presentation', rel)
      expect(
        fs.existsSync(fullPath),
        `DuckDB hook allowlisted file does not exist: presentation/${rel}`,
      ).toBe(true)
    }
  })

  // ─── 前年日付の独自計算禁止ガード ─────────────────────
  // 禁止事項 #2: 引数を無視して別ソースから再計算する
  // presentation 層で dowOffset を使った前年日付の独自計算を禁止。
  // 前年同曜日の日付解決は domain/models/ComparisonScope.ts の
  // resolveSameDowSource アルゴリズムに従うこと。

  /** dowOffset による日付計算パターン（独自の同曜日補正） */
  const DOW_OFFSET_CALC_PATTERN = /\.setDate\([^)]*-\s*dowOffset/

  /**
   * 許可リスト: resolveSameDowSource と同一アルゴリズムを使用しているファイル。
   * これらのファイルは anchor ±7日の最近傍探索を実装しており、
   * dowOffset による独自補正は含まない。
   */
  const DOW_CALC_ALLOWLIST = buildAllowlistSet(dowCalcOverride)

  it('presentation 層で dowOffset による前年日付の独自計算を禁止', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violating: string[] = []

    for (const file of files) {
      const relPath = path.relative(path.join(SRC_DIR, 'presentation'), file)
      if (DOW_CALC_ALLOWLIST.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (DOW_OFFSET_CALC_PATTERN.test(content)) {
        violating.push(relPath)
      }
    }

    expect(
      violating.length,
      `dowOffset による独自日付計算が検出されました。\n` +
        `前年同曜日の日付は domain/ComparisonScope の resolveSameDowSource アルゴリズムに従ってください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBe(0)
  })
})
