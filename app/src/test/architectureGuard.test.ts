/**
 * アーキテクチャガードテスト
 *
 * レイヤー間の依存ルールをソースコードの import 文をスキャンして検証する。
 *
 * ルール:
 * - domain/ → 外部層へのインポートなし
 * - application/ → infrastructure/ へのインポートは許可リストのみ
 * - presentation/ → infrastructure/ へのインポートなし
 * - App.tsx（コンポジションルート）は例外として infrastructure を直接参照可能
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '..')

// ─── ヘルパー ───────────────────────────────────────────

/** 指定ディレクトリ以下の全 .ts/.tsx ファイルを再帰的に収集する */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // node_modules, dist, __tests__ のようなディレクトリはスキップ
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      results.push(...collectTsFiles(fullPath))
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      results.push(fullPath)
    }
  }
  return results
}

/** ファイルから import 文のモジュールパスを抽出する */
function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports: string[] = []
  // import ... from '...' / import '...'
  const regex =
    /(?:import\s+(?:.*?\s+from\s+)?['"](@\/[^'"]+)['"]|export\s+.*?\s+from\s+['"](@\/[^'"]+)['"])/g
  let match
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1] ?? match[2])
  }
  return imports
}

/** SRC_DIR からの相対パスを返す */
function relativePath(filePath: string): string {
  return path.relative(SRC_DIR, filePath)
}

// ─── 許可リスト ──────────────────────────────────────────

/**
 * Application → Infrastructure の許可リスト。
 * これらのファイルは infrastructure に直接依存することが現時点で許可されている。
 * Phase 2〜6 で段階的に解消する。
 */
const APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST = new Set([
  // DuckDB 統合 — ライフサイクル管理
  'application/hooks/useDuckDB.ts',
  // DuckDB 統合 — 責務別クエリフック（Phase 6 で useDuckDBQuery.ts から分割）
  'application/hooks/duckdb/useCtsQueries.ts',
  'application/hooks/duckdb/useDeptKpiQueries.ts',
  'application/hooks/duckdb/useSummaryQueries.ts',
  'application/hooks/duckdb/useYoyQueries.ts',
  'application/hooks/duckdb/useFeatureQueries.ts',
  'application/hooks/duckdb/useAdvancedQueries.ts',
  // DuckDB 統合 — 店舗期間メトリクス + 予算分析クエリフック
  'application/hooks/duckdb/useMetricsQueries.ts',
  // DuckDB 統合 — 日別明細クエリフック
  'application/hooks/duckdb/useDailyRecordQueries.ts',
  // 永続化インフラ接続 — ストレージ状態・復旧・バックアップ
  'application/hooks/useStoragePersistence.ts',
  'application/hooks/useDataRecovery.ts',
  'application/hooks/useBackup.ts',
  // ファイルインポート（infrastructure のパーサー + rawFileStore を使用）
  'application/hooks/useImport.ts',
  'application/usecases/import/FileImportService.ts',
  'application/workers/fileParseWorker.ts',
  'application/workers/useFileParseWorker.ts',
  // エクスポート機能ブリッジ（Phase 3 で作成: ExportPort の実装）
  'application/usecases/export/ExportService.ts',
  // i18n ブリッジ（Phase 10-3a: presentation 層から infrastructure/i18n への直接依存を回避）
  'application/hooks/useI18n.ts',
])

/**
 * Presentation → Infrastructure の許可リスト。
 * Phase 3 で全件解消済み。新たな違反の追加は禁止。
 */
const PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST = new Set<string>([
  // QueryProfilePanel は DevTools 専用コンポーネントで queryProfiler を直接参照する
  'presentation/components/DevTools/QueryProfilePanel.tsx',
])

/**
 * Infrastructure → Application の許可リスト。
 * 後方互換 re-export のみ許可。
 */
const INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST = new Set([
  // 後方互換 re-export（Phase 1 で作成）
  'infrastructure/utilities/murmurhash.ts',
  'infrastructure/storage/diffCalculator.ts',
])

// ─── テスト ──────────────────────────────────────────────

describe('Architecture Guard', () => {
  it('domain/ は外部層に依存しない', () => {
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (
          imp.startsWith('@/application/') ||
          imp.startsWith('@/infrastructure/') ||
          imp.startsWith('@/presentation/')
        ) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('application/ は infrastructure/ に直接依存しない（許可リスト除く）', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('application/ は presentation/ に依存しない', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は infrastructure/ に直接依存しない（許可リスト除く）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('infrastructure/ は application/ に依存しない（後方互換 re-export 除く）', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('infrastructure/ は presentation/ に依存しない', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

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

  it('許可リストのファイルが実在する', () => {
    const allAllowlists = [
      ...APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST,
      ...PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST,
      ...INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST,
    ]

    for (const rel of allAllowlists) {
      const fullPath = path.join(SRC_DIR, rel)
      expect(fs.existsSync(fullPath), `Allowlisted file does not exist: ${rel}`).toBe(true)
    }
  })
})
