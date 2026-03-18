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
 *
 * application/hooks/duckdb/ は adapter pattern として infrastructure/duckdb/ への
 * 依存が構造的に正しいため、ディレクトリ単位で許可（個別登録不要）。
 * 以下は duckdb/ 以外で infrastructure に依存するファイルのみ。
 */
const APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST = new Set([
  // DuckDB 統合 — ライフサイクル管理（hooks/ 直下、duckdb/ サブディレクトリ外）
  'application/hooks/useDuckDB.ts',
  // DuckDB 統合 — 汎用生データ取得（filterStore 経由の統一エントリーポイント）
  'application/hooks/useRawDataFetch.ts',
  // 永続化インフラ接続 — ストレージ状態・復旧・バックアップ・フォルダ連携
  'application/hooks/useStoragePersistence.ts',
  'application/hooks/useDataRecovery.ts',
  'application/hooks/useBackup.ts',
  'application/hooks/useAutoBackup.ts',
  'application/hooks/useAutoImport.ts',
  // ファイルインポート（infrastructure のパーサー + rawFileStore を使用）
  'application/hooks/useImport.ts',
  'application/usecases/import/FileImportService.ts',
  // エクスポート機能ブリッジ（Phase 3 で作成: ExportPort の実装）
  'application/usecases/export/ExportService.ts',
  // i18n ブリッジ（Phase 10-3a: presentation 層から infrastructure/i18n への直接依存を回避）
  'application/hooks/useI18n.ts',
  // 天気データ取得サービス（気象庁 ETRN クライアントを使用）
  'application/usecases/weather/WeatherLoadService.ts',
  // ジオコーディングブリッジ（presentation 層から infrastructure への直接依存を回避）
  'application/hooks/useGeocode.ts',
  // 週間天気予報取得サービス（気象庁 Forecast API を使用）
  'application/usecases/weather/ForecastLoadService.ts',
  // 週間天気予報ブリッジ（presentation 層から infrastructure への直接依存を回避）
  'application/hooks/useWeatherForecast.ts',
  // 天気時間帯クエリフック（DuckDB weather_hourly テーブルを使用）
  'application/hooks/duckdb/useWeatherHourlyQuery.ts',
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
 * 純粋ユーティリティ（hash等）の参照を許可。
 */
const INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST = new Set<string>([
  // RawDataPort アダプター: application/ports の RawDataPort インターフェースを実装
  'infrastructure/storage/IndexedDBRawDataAdapter.ts',
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
      // DuckDB adapter hooks: infrastructure/duckdb/ への依存は構造的に正しい
      if (rel.startsWith('application/hooks/duckdb/')) continue
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

  // ─── Vertical Slice Guards（Phase 7） ──────────────────

  it('features/ 間の直接 import がない（shared/ 経由のみ）', () => {
    const featuresDir = path.join(SRC_DIR, 'features')
    if (!fs.existsSync(featuresDir)) return
    const files = collectTsFiles(featuresDir)
    const violations: string[] = []

    // features/*/内のスライス名を収集
    const sliceDirs = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'shared')
      .map((e) => e.name)

    for (const file of files) {
      const rel = relativePath(file)
      const imports = extractImports(file)

      // このファイルが属するスライスを特定
      const ownerSlice = sliceDirs.find((s) => rel.startsWith(`features/${s}/`))
      if (!ownerSlice) continue

      for (const imp of imports) {
        // 他のスライスへの直接参照をチェック
        for (const otherSlice of sliceDirs) {
          if (otherSlice === ownerSlice) continue
          if (
            imp.includes(`/features/${otherSlice}/`) ||
            imp.startsWith(`@/features/${otherSlice}`)
          ) {
            violations.push(
              `${rel}: ${imp} — features/${ownerSlice}/ は features/${otherSlice}/ に直接依存できません。shared/ 経由を使用してください`,
            )
          }
        }
      }
    }

    expect(violations).toEqual([])
  })

  // ─── 統一フィルタ層ガード（DuckDB直接参照の段階的廃止）──

  /**
   * ⚠️ TECH DEBT — filterStore 抽象化完了後に廃止予定
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
  const PRESENTATION_DUCKDB_HOOK_ALLOWLIST = new Set([
    // ── ウィジェットコンテキスト（Phase B で移行） ──
    'hooks/useUnifiedWidgetContext.ts',
    'components/widgets/types.ts',
    // ── DuckDB チャート（Phase C Wave 1-3 で移行） ──
    'components/charts/CategoryHierarchyExplorer.tsx',
    'components/charts/CategoryPerformanceChart.tsx',
    'components/charts/CategoryBenchmarkChart.styles.ts',
    'components/charts/CategoryHourlyChart.tsx',
    'components/charts/DeptHourlyChart.tsx',
    'components/charts/DowPatternChart.tsx',
    'components/charts/FeatureChart.tsx',
    'components/charts/HeatmapChart.helpers.ts',
    'components/charts/HourlyProfileChart.tsx',
    'components/charts/TimeSlotChart.tsx',
    'components/charts/YoYChart.tsx',
    'components/charts/ShapleyTimeSeriesChart.tsx',
    // ── ページ・ウィジェット（Phase C で移行） ──
    'pages/Admin/AdminPage.tsx',
    'pages/Admin/ImportHistoryTab.tsx',
    'pages/Admin/PrevYearMappingTab.tsx',
    'pages/Admin/StorageManagementTab.tsx',
    'pages/Category/CategoryPage.tsx',
    'pages/CostDetail/useCostDetailData.ts',
    'pages/Daily/DailyPage.tsx',
    'pages/Dashboard/DashboardPage.tsx',
    'pages/Dashboard/widgets/ConditionMatrixTable.styles.ts',
    'pages/Dashboard/widgets/DayDetailModal.tsx',
    'pages/Dashboard/widgets/MonthlyCalendar.tsx',
    'pages/Dashboard/widgets/RangeComparison.tsx',
    'pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    'pages/Dashboard/widgets/types.ts',
    'pages/Forecast/ForecastPage.helpers.ts',
    'pages/Mobile/KpiTabContent.tsx',
    'pages/Reports/ReportsPage.tsx',
    // ── 仕入分析ページ ──
    'pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx',
    // ── レイアウト（DuckDB 接続状態表示用） ──
    'components/Layout/MainContent.tsx',
    'components/Layout/NavBar.tsx',
  ])

  it('presentation/ の新規ファイルは DuckDB フックを直接使用しない（filterStore 経由を使用）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // DuckDB フックの import パターン
    const DUCKDB_HOOK_PATTERNS = [
      /import\s+.*from\s+['"]@\/application\/hooks\/duckdb['"]/,
      /import\s+.*useDuckDB.*from\s+['"]@\/application\/hooks['"]/,
      /import\s+.*useDuckDB.*from\s+['"]@\/application\/hooks\/useDuckDB['"]/,
    ]

    for (const file of files) {
      const rel = path.relative(path.join(SRC_DIR, 'presentation'), file)
      if (PRESENTATION_DUCKDB_HOOK_ALLOWLIST.has(rel)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of DUCKDB_HOOK_PATTERNS) {
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
    const MAX_ALLOWLIST_SIZE = 34
    expect(PRESENTATION_DUCKDB_HOOK_ALLOWLIST.size).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
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

  it('DuckDB フック許可リストのファイルが実在する', () => {
    for (const rel of PRESENTATION_DUCKDB_HOOK_ALLOWLIST) {
      const fullPath = path.join(SRC_DIR, 'presentation', rel)
      expect(
        fs.existsSync(fullPath),
        `DuckDB hook allowlisted file does not exist: presentation/${rel}`,
      ).toBe(true)
    }
  })
})
