/**
 * DuckDB 統合のアーキテクチャガードテスト
 *
 * DuckDB ウィジェット群が設計原則に従っていることを静的に検証する:
 * - DuckDB チャートが生データ（records[]）を直接参照していないこと
 * - クエリモジュールのエクスポートが useDuckDBQuery.ts と整合していること
 * - ウィジェットレジストリに全 DuckDB ウィジェットが登録されていること
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_ROOT = path.resolve(__dirname, '../../../')

// ── ヘルパー ──

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf-8')
}

function listDuckDBCharts(): string[] {
  const chartsDir = path.join(SRC_ROOT, 'presentation/components/charts')
  return fs.readdirSync(chartsDir).filter((f) => f.startsWith('DuckDB') && f.endsWith('.tsx'))
}

// ── テスト ──

describe('DuckDB ウィジェットが禁止パターンを使用していないこと', () => {
  const chartFiles = listDuckDBCharts()

  it('DuckDB チャートファイルが存在する', () => {
    expect(chartFiles.length).toBeGreaterThanOrEqual(10)
  })

  for (const file of chartFiles) {
    // DateRangePicker はウィジェットではなくコントロールなのでスキップ
    if (file === 'DuckDBDateRangePicker.tsx') continue

    describe(file, () => {
      const content = readFile(`presentation/components/charts/${file}`)

      it('categoryTimeSales.records を直接参照していない', () => {
        expect(content).not.toContain('categoryTimeSales.records')
        expect(content).not.toContain('.records.filter')
        expect(content).not.toContain('.records.reduce')
      })

      it('WidgetContext の生データプロパティを参照していない', () => {
        expect(content).not.toContain('ImportedData')
        expect(content).not.toContain('categoryTimeSales:')
      })

      it('useDuckDB 系フックまたはフック結果の props を使用している', () => {
        const usesDuckDBHook = content.includes('useDuckDB')
        const receivesDuckConn = content.includes('duckConn')
        expect(usesDuckDBHook || receivesDuckConn).toBe(true)
      })
    })
  }
})

describe('DuckDB クエリモジュールの barrel export', () => {
  const indexContent = readFile('infrastructure/duckdb/index.ts')

  it('全クエリモジュールが barrel export されている', () => {
    const modules = [
      'categoryTimeSales',
      'departmentKpi',
      'storeDaySummary',
      'yoyComparison',
      'features',
      'advancedAnalytics',
    ]
    for (const mod of modules) {
      expect(indexContent).toContain(mod)
    }
  })
})

describe('DuckDB クエリフックの責務分割', () => {
  const hookModules = [
    'application/hooks/duckdb/useCtsQueries.ts',
    'application/hooks/duckdb/useDeptKpiQueries.ts',
    'application/hooks/duckdb/useSummaryQueries.ts',
    'application/hooks/duckdb/useYoyQueries.ts',
    'application/hooks/duckdb/useFeatureQueries.ts',
    'application/hooks/duckdb/useAdvancedQueries.ts',
  ]

  it('責務別モジュールが全て存在する', () => {
    for (const mod of hookModules) {
      const fullPath = path.join(SRC_ROOT, mod)
      expect(fs.existsSync(fullPath), `Missing: ${mod}`).toBe(true)
    }
  })

  it('useDuckDB で始まるフック関数が全モジュール合計で 14 個以上ある', () => {
    let totalHooks = 0
    for (const mod of hookModules) {
      const content = readFile(mod)
      const matches = content.match(/export function useDuckDB\w+/g) ?? []
      totalHooks += matches.length
    }
    expect(totalHooks).toBeGreaterThanOrEqual(14)
  })

  it('useAsyncQuery 汎用フックが定義されている', () => {
    const asyncQueryContent = readFile('application/hooks/duckdb/useAsyncQuery.ts')
    expect(asyncQueryContent).toContain('function useAsyncQuery')
  })

  it('barrel index が全モジュールを re-export している', () => {
    const indexContent = readFile('application/hooks/duckdb/index.ts')
    for (const mod of hookModules) {
      const baseName = path.basename(mod, '.ts')
      expect(indexContent).toContain(baseName)
    }
  })

  it('後方互換バレル useDuckDBQuery.ts が duckdb/ を re-export している', () => {
    const barrelContent = readFile('application/hooks/useDuckDBQuery.ts')
    expect(barrelContent).toContain("from './duckdb'")
  })
})

describe('ウィジェットレジストリの DuckDB エントリ', () => {
  const registryDir = path.join(SRC_ROOT, 'presentation/pages/Dashboard/widgets')
  const registryContent = fs
    .readdirSync(registryDir)
    .filter((f) => f.startsWith('registry') && f.endsWith('.tsx'))
    .map((f) => fs.readFileSync(path.join(registryDir, f), 'utf-8'))
    .join('\n')

  // DuckDB 専用ウィジェット（レジストリに直接登録）
  const duckdbOnlyWidgetIds = [
    'analysis-duckdb-features',
    'analysis-duckdb-cumulative',
    'analysis-duckdb-dept-trend',
    'duckdb-dow-pattern',
    'duckdb-hourly-profile',
    'duckdb-category-trend',
    'duckdb-category-hourly',
    'duckdb-category-mix',
    'duckdb-category-benchmark',
    'duckdb-category-boxplot',
  ]

  // 統合ウィジェット（DuckDB/CTS 自動切替）
  const unifiedWidgetIds = [
    'chart-timeslot-sales',
    'chart-timeslot-heatmap',
    'chart-dept-hourly-pattern',
    'chart-store-timeslot-comparison',
    'analysis-yoy-variance',
  ]

  for (const widgetId of duckdbOnlyWidgetIds) {
    it(`DuckDB専用ウィジェット '${widgetId}' が登録されている`, () => {
      expect(registryContent).toContain(`'${widgetId}'`)
    })
  }

  for (const widgetId of unifiedWidgetIds) {
    it(`統合ウィジェット '${widgetId}' が登録されている`, () => {
      expect(registryContent).toContain(`'${widgetId}'`)
    })
  }

  it('DuckDB 専用ウィジェットに isVisible ガードがある', () => {
    // duckDataVersion > 0 の条件が DuckDB 専用ウィジェットに含まれていること
    const duckVisibilityCount = (registryContent.match(/duckDataVersion > 0/g) ?? []).length
    // 9 DuckDB専用エントリのうち少なくとも 5 個は直接ガード（残りは isVisible 関数経由）
    expect(duckVisibilityCount).toBeGreaterThanOrEqual(5)
  })

  it('統合ウィジェットが UnifiedAnalyticsWidgets を使用している', () => {
    expect(registryContent).toContain('UnifiedTimeSlotWidget')
    expect(registryContent).toContain('UnifiedHeatmapWidget')
    expect(registryContent).toContain('UnifiedDeptHourlyWidget')
    expect(registryContent).toContain('UnifiedStoreHourlyWidget')
    expect(registryContent).toContain('UnifiedYoYWidget')
  })
})

describe('charts/index.ts の DuckDB エクスポート', () => {
  // サブバレル経由の re-export を含めて検証
  const chartsIndex =
    readFile('presentation/components/charts/index.ts') +
    readFile('presentation/components/charts/duckdb.ts')

  const expectedExports = [
    'DuckDBFeatureChart',
    'DuckDBCumulativeChart',
    'DuckDBYoYChart',
    'DuckDBDeptTrendChart',
    'DuckDBTimeSlotChart',
    'DuckDBHeatmapChart',
    'DuckDBDeptHourlyChart',
    'DuckDBStoreHourlyChart',
    'DuckDBDowPatternChart',
    'DuckDBHourlyProfileChart',
    'DuckDBCategoryTrendChart',
    'DuckDBCategoryHourlyChart',
    'DuckDBCategoryMixChart',
    'DuckDBCategoryBenchmarkChart',
  ]

  for (const exportName of expectedExports) {
    it(`${exportName} がエクスポートされている`, () => {
      expect(chartsIndex).toContain(exportName)
    })
  }
})
