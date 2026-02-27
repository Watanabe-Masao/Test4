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

describe('useDuckDBQuery.ts のフック数', () => {
  const hookContent = readFile('application/hooks/useDuckDBQuery.ts')

  it('useDuckDB で始まるフック関数が 14 個以上ある', () => {
    const hookMatches = hookContent.match(/export function useDuckDB\w+/g) ?? []
    expect(hookMatches.length).toBeGreaterThanOrEqual(14)
  })

  it('useAsyncQuery 汎用フックが定義されている', () => {
    expect(hookContent).toContain('function useAsyncQuery')
  })
})

describe('ウィジェットレジストリの DuckDB エントリ', () => {
  const registryContent = readFile('presentation/pages/Dashboard/widgets/registry.tsx')

  const expectedWidgetIds = [
    'analysis-duckdb-features',
    'analysis-duckdb-cumulative',
    'analysis-duckdb-yoy',
    'analysis-duckdb-dept-trend',
    'duckdb-timeslot',
    'duckdb-heatmap',
    'duckdb-dept-hourly',
    'duckdb-store-hourly',
    'duckdb-dow-pattern',
    'duckdb-hourly-profile',
    'duckdb-category-trend',
    'duckdb-category-hourly',
    'duckdb-category-mix',
    'duckdb-store-benchmark',
  ]

  for (const widgetId of expectedWidgetIds) {
    it(`ウィジェット '${widgetId}' が登録されている`, () => {
      expect(registryContent).toContain(`'${widgetId}'`)
    })
  }

  it('DuckDB ウィジェットに isVisible ガードがある', () => {
    // duckDataVersion > 0 の条件が含まれていること
    const duckVisibilityCount = (registryContent.match(/duckDataVersion > 0/g) ?? []).length
    expect(duckVisibilityCount).toBeGreaterThanOrEqual(10)
  })
})

describe('charts/index.ts の DuckDB エクスポート', () => {
  const chartsIndex = readFile('presentation/components/charts/index.ts')

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
    'DuckDBStoreBenchmarkChart',
  ]

  for (const exportName of expectedExports) {
    it(`${exportName} がエクスポートされている`, () => {
      expect(chartsIndex).toContain(exportName)
    })
  }
})
