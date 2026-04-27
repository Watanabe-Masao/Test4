/**
 * DuckDB 統合のアーキテクチャガードテスト
 *
 * 統一パイプライン（ADR-003）のチャート群が設計原則に従っていることを静的に検証する:
 * - パイプラインチャートが生データ（records[]）を直接参照していないこと
 * - クエリモジュールのエクスポートが duckdb/index.ts と整合していること
 * - ウィジェットレジストリに全 DuckDB ウィジェットが登録されていること
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_ROOT = path.resolve(__dirname, '../../../')

// ── ヘルパー ──

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf-8')
}

/**
 * DuckDB データ供給パイプラインのチャートファイル一覧
 *
 * ADR-003 により DuckDB プレフィックスを削除済み。
 * duckdb.ts バレルで re-export されているチャートを正規のリストとする。
 */
function listPipelineCharts(): string[] {
  const barrelContent = readFile('presentation/components/charts/duckdb.ts')
  const matches = barrelContent.match(/from '\.\/(\w+)'/g) ?? []
  return matches.map((m) => {
    const name = m.match(/from '\.\/(\w+)'/)?.[1]
    return `${name}.tsx`
  })
}

// ── テスト ──

describe('パイプラインチャートが禁止パターンを使用していないこと', () => {
  const chartFiles = listPipelineCharts()

  it('パイプラインチャートファイルが存在する', () => {
    expect(chartFiles.length).toBeGreaterThanOrEqual(10)
  })

  for (const file of chartFiles) {
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

      it('DuckDB 系フックまたは QueryHandler 経由でデータを取得している', () => {
        const usesDuckDBHook = content.includes('useDuckDB')
        const receivesDuckConn = content.includes('duckConn')
        const usesQueryHandler = content.includes('useQueryWithHandler')
        const receivesQueryExecutor = content.includes('queryExecutor')
        // VM パターン: データ取得は .vm.ts に委譲されている（.vm.ts 側で queryExecutor 等を使用）
        const vmFile = file.replace('.tsx', '.vm.ts')
        const vmPath = path.join(SRC_ROOT, 'presentation/components/charts', vmFile)
        const usesVmPattern = fs.existsSync(vmPath) && content.includes(vmFile.replace('.ts', ''))
        expect(
          usesDuckDBHook ||
            receivesDuckConn ||
            usesQueryHandler ||
            receivesQueryExecutor ||
            usesVmPattern,
        ).toBe(true)
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
    'application/hooks/duckdb/useCtsHierarchyQueries.ts',
    'application/hooks/duckdb/useCtsAggregationQueries.ts',
    'application/hooks/duckdb/useDeptKpiQueries.ts',
    'application/hooks/duckdb/useSummaryQueries.ts',
    'application/hooks/duckdb/useYoyQueries.ts',
    'application/hooks/duckdb/useFeatureQueries.ts',
    'application/hooks/duckdb/useAdvancedQueries.ts',
  ]

  // hookModules のサブセット（中間バレル廃止後は hookModules に統合済み）
  const subModules: string[] = []

  it('責務別モジュールが全て存在する', () => {
    for (const mod of hookModules) {
      const fullPath = path.join(SRC_ROOT, mod)
      expect(fs.existsSync(fullPath), `Missing: ${mod}`).toBe(true)
    }
  })

  it('useDuckDB で始まるフック関数が全モジュール合計で 14 個以上ある', () => {
    let totalHooks = 0
    for (const mod of [...hookModules, ...subModules]) {
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
    for (const mod of [...hookModules, ...subModules]) {
      const baseName = path.basename(mod, '.ts')
      expect(indexContent).toContain(baseName)
    }
  })

  // 後方互換バレル useDuckDBQuery.ts は削除済み — 全消費者が duckdb/ を直接参照
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
    // 注: analysis-duckdb-cumulative → DailySalesChart「累計」ビューに統合
    'duckdb-dow-pattern',
    // 注: duckdb-category-trend → IntegratedCategoryAnalysis「売上推移」タブに統合
    // 注: duckdb-category-hourly → TimeSlotChart 部門別モードに統合
    'duckdb-category-mix',
    'duckdb-category-benchmark',
    'duckdb-category-boxplot',
  ]

  // 統合ウィジェット（DuckDB/CTS 自動切替）
  const unifiedWidgetIds = [
    // 注: chart-timeslot-sales → IntegratedSalesChart ドリルダウンに統合
    'chart-timeslot-heatmap',
    // 注: chart-dept-hourly-pattern → IntegratedSalesChart 孫に統合
    'chart-store-timeslot-comparison',
    // 注: analysis-yoy-variance → DailySalesChart「差分」ビューに統合
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
    // queryExecutor(.|?.)isReady === true の条件が DuckDB 専用ウィジェットに
    // 含まれていること。SP-B ADR-B-001 PR2 (commit bf426b5) で
    // `Pick<DashboardWidgetContext, ...>` による type narrowing に伴い
    // optional chaining `?.` を取り除いたため、両形式を許容する。
    const duckVisibilityCount = (registryContent.match(/queryExecutor\??\.isReady === true/g) ?? [])
      .length
    // 6 DuckDB専用エントリのうち少なくとも 3 個は直接ガード（残りは isVisible 関数経由）
    expect(duckVisibilityCount).toBeGreaterThanOrEqual(3)
  })

  it('統合ウィジェットが UnifiedAnalyticsWidgets を使用している', () => {
    // 注: UnifiedTimeSlotWidget → IntegratedSalesChart ドリルダウンに統合
    expect(registryContent).toContain('UnifiedHeatmapWidget')
    // 注: UnifiedDeptHourlyWidget → IntegratedSalesChart 孫に統合
    expect(registryContent).toContain('UnifiedStoreHourlyWidget')
    // 注: UnifiedYoYWidget → DailySalesChart「差分」ビューに統合
  })
})

describe('charts/index.ts の DuckDB エクスポート', () => {
  // サブバレル経由の re-export を含めて検証
  const chartsIndex =
    readFile('presentation/components/charts/index.ts') +
    readFile('presentation/components/charts/duckdb.ts')

  const expectedExports = [
    'FeatureChart',
    'CumulativeChart',
    'YoYChart',
    'DeptTrendChart',
    'TimeSlotChart',
    'HeatmapChart',
    'DeptHourlyChart',
    'StoreHourlyChart',
    'DowPatternChart',
    'CategoryTrendChart',
    'CategoryHourlyChart',
    'CategoryMixChart',
    'CategoryBenchmarkChart',
  ]

  for (const exportName of expectedExports) {
    it(`${exportName} がエクスポートされている`, () => {
      expect(chartsIndex).toContain(exportName)
    })
  }
})
