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
    ['application/hooks/duckdb/purchaseComparisonBuilders.ts', 30],
    ['application/hooks/duckdb/purchaseComparisonKpi.ts', 200],
    ['application/hooks/duckdb/purchaseComparisonCategory.ts', 250],
    ['application/hooks/duckdb/purchaseComparisonDaily.ts', 230],
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
    // 追加抽出: useConditionMatrix, useMonthlyHistory
    ['application/hooks/duckdb/useConditionMatrix.ts', 60],
    ['application/hooks/useMonthlyHistory.ts', 200],
    // useComparisonModule facade thin化
    ['application/hooks/useComparisonModule.ts', 210],
    // Phase A: useJsAggregationQueries 2分割（barrel化）
    ['application/hooks/duckdb/useJsAggregationQueries.ts', 30],
    ['application/hooks/duckdb/useJsFeatureQueries.ts', 150],
    ['application/hooks/duckdb/useJsSalesCompQueries.ts', 160],
    // Phase A: useCtsQueries 2分割（barrel化）
    ['application/hooks/duckdb/useCtsQueries.ts', 35],
    ['application/hooks/duckdb/useCtsHierarchyQueries.ts', 200],
    ['application/hooks/duckdb/useCtsAggregationQueries.ts', 180],
    // Phase A: useReducer 化に伴う reducer ファイル
    ['application/hooks/duckdbReducer.ts', 80],
    ['application/hooks/autoImportReducer.ts', 90],
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
    'application/hooks/duckdb/purchaseComparisonKpi.ts',
    'application/hooks/duckdb/purchaseComparisonCategory.ts',
    'application/hooks/duckdb/purchaseComparisonDaily.ts',
    'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    'application/hooks/duckdb/categoryBoxPlotLogic.ts',
    'application/usecases/import/singleMonthImport.ts',
    'application/usecases/import/multiMonthImport.ts',
    'application/usecases/import/importHelpers.ts',
    'application/usecases/clipExport/clipCss.ts',
    'application/usecases/clipExport/clipJs.ts',
    'application/hooks/duckdb/conditionMatrixLogic.ts',
    'application/hooks/monthlyHistoryLogic.ts',
    'application/comparison/comparisonDataPrep.ts',
    'application/comparison/buildComparisonAggregation.ts',
    // Reducer ファイル（React-free pure function）
    'application/hooks/duckdbReducer.ts',
    'application/hooks/autoImportReducer.ts',
    // Presentation 層 Logic ファイル（React-free）
    'presentation/components/charts/useDuckDBTimeSlotDataLogic.ts',
    // Presentation VM ファイル（React-free）
    'presentation/pages/Dashboard/widgets/conditionPanelProfitability.vm.ts',
    'presentation/pages/Dashboard/widgets/conditionPanelMarkupCost.vm.ts',
    'presentation/pages/Dashboard/widgets/conditionPanelYoY.vm.ts',
    'presentation/pages/Dashboard/widgets/conditionPanelSalesDetail.vm.ts',
    'presentation/components/charts/CvTimeSeriesChart.vm.ts',
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

// ─── R11: hook ファイルの useMemo カウント上限 ──────────────

describe('R11: hooks/ の useMemo 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // useMemo が多い既存ファイルの許容リスト
  // useComparisonModule: 7 useMemo — comparison 層の集約 hook。分割は過剰
  const allowlist: Record<string, number> = {
    'application/hooks/useComparisonModule.ts': 8,
  }

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? 7

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, `useMemo 過多のファイルが検出されました:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})

// ─── R11: hook ファイルの useState カウント上限 ──────────────

describe('R11: hooks/ の useState 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // useState が多い既存ファイルの許容リスト
  // usePersistence: 6 useState — persistence 初期化に必要な状態群。useReducer 化は過剰
  // useAutoBackup: 6 useState — バックアップ状態管理に必要。useReducer 化は過剰
  const allowlist: Record<string, number> = {
    'application/hooks/usePersistence.ts': 7,
    'application/hooks/useAutoBackup.ts': 7,
  }

  it('useState 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? 6

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `useState 過多のファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R11: hook ファイルの汎用行数上限（300行） ──────────────

describe('R11: hooks/ の .ts ファイルが行数上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // 300行超のファイルのみ個別追跡
  // categoryBenchmarkLogic: 純粋計算ロジック集約、分割は過剰
  // usePeriodAwareKpi: 300行境界、期間KPI集約に必要な凝集度
  const allowlist: Record<string, number> = {
    'application/hooks/duckdb/categoryBenchmarkLogic.ts': 450,
    'application/hooks/usePeriodAwareKpi.ts': 310,
  }

  it('hook ファイルが行数上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lineCount = content.split('\n').length
      const limit = allowlist[relPath] ?? 300

      if (lineCount > limit) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `行数超過の hook ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R12/禁止#7: Presentation コンポーネントの行数制限 ─────

describe('R12/禁止#7: Presentation コンポーネントの行数制限', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')

  // ── Tier 2: 大型コンポーネント（600行超）— 個別追跡、次回改修時に分割義務 ──
  const largeComponentLimits: [string, number][] = [
    ['presentation/components/charts/TimeSlotChart.tsx', 660],
  ]

  // ── Tier 1: 中型コンポーネント（401-599行）— 一律600行上限で管理 ──
  const midSizeComponents = new Set([
    'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    'presentation/pages/Admin/StorageManagementTab.tsx',
    'presentation/pages/Forecast/ForecastChartsCustomer.tsx',
    'presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx',
    'presentation/components/charts/BudgetVsActualChart.tsx',
    'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    'presentation/pages/Dashboard/widgets/ForecastTools.tsx',
    'presentation/pages/Insight/InsightTabForecast.tsx',
    'presentation/components/charts/EstimatedInventoryDetailChart.tsx',
    'presentation/components/charts/PerformanceIndexChart.tsx',
    'presentation/pages/Dashboard/widgets/ConditionSummary.tsx',
    'presentation/pages/Dashboard/widgets/HourlyChart.tsx',
    'presentation/pages/Insight/InsightTabBudget.tsx',
    'presentation/components/charts/YoYVarianceChart.tsx',
    'presentation/components/charts/StoreHourlyChart.tsx',
    'presentation/pages/Dashboard/widgets/StoreKpiTableInner.tsx',
    'presentation/components/charts/SensitivityDashboard.tsx',
    'presentation/pages/Reports/ReportSummaryGrid.tsx',
    'presentation/pages/Category/CategoryTotalView.tsx',
    'presentation/components/charts/CustomerScatterChart.tsx',
    'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    'presentation/components/charts/CategoryTrendChart.tsx',
    'presentation/pages/Daily/DailyPage.tsx',
    'presentation/components/charts/CategoryHierarchyExplorer.tsx',
    'presentation/components/charts/CategoryPerformanceChart.tsx',
    'presentation/components/charts/DailySalesChartBody.tsx',
    'presentation/components/charts/SalesPurchaseComparisonChart.tsx',
    'presentation/pages/Admin/AdminPage.tsx',
    'presentation/pages/Admin/ImportHistoryTab.tsx',
    'presentation/pages/Dashboard/DashboardPage.tsx',
    'presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx',
    'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    'presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx',
    'presentation/pages/Dashboard/widgets/ConditionSummaryDailyModal.tsx',
  ])

  const allRegisteredPaths = new Set([
    ...largeComponentLimits.map(([p]) => p),
    ...midSizeComponents,
  ])

  it.each(largeComponentLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(
      lineCount,
      `${relPath} は ${lineCount} 行 (上限: ${maxLines})。分割してから機能追加すること`,
    ).toBeLessThanOrEqual(maxLines)
  })

  it('中型コンポーネント（Tier 1）は 600 行以下', () => {
    const violations: string[] = []
    for (const relPath of midSizeComponents) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 600) {
        violations.push(
          `${relPath}: ${lineCount}行 (中型上限: 600)。Tier 2 に昇格または分割すること`,
        )
      }
    }
    expect(violations, `600行超の中型コンポーネント:\n${violations.join('\n')}`).toEqual([])
  })

  it('未登録の Presentation .tsx ファイルが 400 行以下', () => {
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      // styles, stories ファイルは除外
      if (file.includes('.styles.') || file.includes('.stories.')) continue
      const relPath = rel(file)
      if (allRegisteredPaths.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (新規ファイル上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の未登録コンポーネントが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 第3期: Infrastructure 層ファイルサイズ制限 ─────────────

describe('Infrastructure 層の分割後ファイル行数制限', () => {
  const fileLimits: [string, number][] = [
    // Phase 1: dataLoader 分割
    ['infrastructure/duckdb/dataLoader.ts', 280],
    ['infrastructure/duckdb/dataConversions.ts', 560],
    // Phase 2: duckdbWorker 分割
    ['infrastructure/duckdb/worker/duckdbWorker.ts', 200],
    ['infrastructure/duckdb/worker/workerHandlers.ts', 350],
    // Phase 3: categoryTimeSales 分割
    ['infrastructure/duckdb/queries/categoryTimeSales.ts', 150],
    ['infrastructure/duckdb/queries/ctsHourlyQueries.ts', 200],
    ['infrastructure/duckdb/queries/ctsHierarchyQueries.ts', 260],
    // Phase 4: monthlyDataOperations 分割
    ['infrastructure/storage/internal/monthlyDataOperations.ts', 100],
    ['infrastructure/storage/internal/monthlyDataSave.ts', 220],
    ['infrastructure/storage/internal/monthlyDataLoad.ts', 270],
    // Phase 5: backupExporter 分割
    ['infrastructure/storage/backupExporter.ts', 350],
    ['infrastructure/storage/backupFormat.ts', 120],
    // Phase 6: ImportDataProcessor 整理
    ['infrastructure/ImportDataProcessor.ts', 400],
    ['infrastructure/storeIdNormalization.ts', 80],
    // Phase 7: purchaseComparison クエリ集約（仕入比較 + 売上 + カテゴリ日別）
    ['infrastructure/duckdb/queries/purchaseComparison.ts', 450],
    // Weather: jmaForecastClient（resolveForcastAreaByLocation 追加）
    ['infrastructure/weather/jmaForecastClient.ts', 460],
  ]

  it.each(fileLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount, `${relPath} は ${lineCount} 行 (上限: ${maxLines})`).toBeLessThanOrEqual(
      maxLines,
    )
  })

  it('未登録の infrastructure .ts ファイルが 400 行以下', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const registeredPaths = new Set(fileLimits.map(([p]) => p))
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    // 除外: schemas.ts (DDL定数), clipJs.ts (テンプレートリテラル)
    const excludeFiles = new Set([
      'infrastructure/duckdb/schemas.ts',
      'infrastructure/export/clipJs.ts',
    ])

    for (const file of files) {
      const relPath = rel(file)
      if (registeredPaths.has(relPath)) continue
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の未登録 infrastructure ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 第3期: Domain 層ファイルサイズ制限 ──────────────────

describe('Domain 層の分割後ファイル行数制限', () => {
  const fileLimits: [string, number][] = [
    // Phase 7: formulaRegistry 分割
    ['domain/constants/formulaRegistry.ts', 60],
    ['domain/constants/formulaRegistryCore.ts', 200],
    ['domain/constants/formulaRegistryBusiness.ts', 340],
    // Phase 8: calculations/utils 分割
    ['domain/calculations/utils.ts', 230],
    ['domain/calculations/averageDivisor.ts', 120],
    ['domain/calculations/dataDetection.ts', 80],
    // Phase 4-5: metricResolver 3段パイプライン化 + policy 駆動 + displayMode
    ['domain/constants/metricResolver.ts', 450],
  ]

  it.each(fileLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount, `${relPath} は ${lineCount} 行 (上限: ${maxLines})`).toBeLessThanOrEqual(
      maxLines,
    )
  })

  it('未登録の domain .ts ファイルが 300 行以下', () => {
    const domainDir = path.join(SRC_DIR, 'domain')
    const registeredPaths = new Set(fileLimits.map(([p]) => p))
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    // 除外: metricDefs.ts (凝集的カタログ), PeriodSelection.ts (300行境界), rawAggregation.ts (復元ファイル), ComparisonScope.ts (DOW解決追加で301行), advancedForecast.ts (天候補正予測追加で346行)
    const excludeFiles = new Set([
      'domain/constants/metricDefs.ts',
      'domain/models/PeriodSelection.ts',
      'domain/calculations/rawAggregation.ts',
      'domain/models/ComparisonScope.ts',
      'domain/calculations/algorithms/advancedForecast.ts',
    ])

    for (const file of files) {
      const relPath = rel(file)
      if (registeredPaths.has(relPath)) continue
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 300) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 300)`)
      }
    }

    expect(
      violations,
      `300行超の未登録 domain ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 第3期: Application usecases ファイルサイズ制限 ─────────

describe('Application usecases の分割後ファイル行数制限', () => {
  const fileLimits: [string, number][] = [
    // Phase 9: FileImportService 分割
    ['application/usecases/import/FileImportService.ts', 220],
    ['application/usecases/import/importValidation.ts', 450],
    // Phase 10: periodMetricsCalculator + ExplanationService 分割
    ['application/usecases/calculation/periodMetricsCalculator.ts', 300],
    ['application/usecases/calculation/periodMetricsTypes.ts', 140],
    ['application/usecases/explanation/ExplanationService.ts', 280],
    ['application/usecases/explanation/salesExplanations.ts', 230],
  ]

  it.each(fileLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount, `${relPath} は ${lineCount} 行 (上限: ${maxLines})`).toBeLessThanOrEqual(
      maxLines,
    )
  })
})

// ─── 第3期: 分割後の純粋モジュールに React import がない ──────

describe('第3期: 分割後の純粋モジュールに React import がない', () => {
  const pureModules = [
    // Infrastructure
    'infrastructure/duckdb/dataConversions.ts',
    'infrastructure/duckdb/worker/workerHandlers.ts',
    'infrastructure/duckdb/queries/ctsHourlyQueries.ts',
    'infrastructure/duckdb/queries/ctsHierarchyQueries.ts',
    'infrastructure/storage/internal/monthlyDataSave.ts',
    'infrastructure/storage/internal/monthlyDataLoad.ts',
    'infrastructure/storage/backupFormat.ts',
    'infrastructure/storeIdNormalization.ts',
    // Domain
    'domain/constants/formulaRegistryCore.ts',
    'domain/constants/formulaRegistryBusiness.ts',
    'domain/calculations/averageDivisor.ts',
    'domain/calculations/dataDetection.ts',
    // Application
    'application/usecases/import/importValidation.ts',
    'application/usecases/calculation/periodMetricsTypes.ts',
    'application/usecases/explanation/salesExplanations.ts',
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

// ─── R5: facade ファイルの分岐数制限 ─────────────────────

describe('R5: facade ファイルの分岐が 5 以下', () => {
  it('facade/ファサード コメント付きファイルの if/switch が 5 以下', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // facade / ファサード をコメントで宣言しているファイルのみ対象
      if (!content.includes('facade') && !content.includes('ファサード')) continue

      const lines = content.split('\n')
      let branchCount = 0
      for (const line of lines) {
        // コメント行は除外
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue
        // if / switch をカウント
        if (/\bif\s*\(/.test(trimmed)) branchCount++
        if (/\bswitch\s*\(/.test(trimmed)) branchCount++
      }

      if (branchCount > 5) {
        violations.push(`${rel(file)}: 分岐 ${branchCount}回 (上限: 5)`)
      }
    }

    expect(violations, `facade に分岐ロジックが混入しています:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})

// ─── R2: useEffect 内の副作用チェーン検出 ────────────────

describe('R2: useEffect 内に fetch→store→cache の密結合がない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // 既存で許容するファイル（凍結。次回改修時に分離義務）
  const allowlist = new Set([
    'application/hooks/useLoadComparisonData.ts', // .then() 2行のみ — 分離は過剰
  ])

  it('useEffect 内に非同期+store更新+キャッシュ操作の3点セットがない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (allowlist.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      let inEffect = false
      let braceDepth = 0
      let effectStart = 0
      let hasAsync = false
      let hasStoreUpdate = false
      let hasCacheOp = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // useEffect の開始を検出
        if (/\buseEffect\s*\(/.test(line)) {
          inEffect = true
          braceDepth = 0
          effectStart = i + 1
          hasAsync = false
          hasStoreUpdate = false
          hasCacheOp = false
        }

        if (inEffect) {
          braceDepth += (line.match(/{/g) || []).length
          braceDepth -= (line.match(/}/g) || []).length

          // 非同期処理
          if (/\bawait\b/.test(line) || /\.then\s*\(/.test(line)) hasAsync = true
          // store 更新
          if (/\bsetState\b/.test(line) || /\bset\s*\(/.test(line) || /\bgetState\s*\(/.test(line))
            hasStoreUpdate = true
          // キャッシュ操作
          if (/\bcache\b/i.test(line) || /\binvalidate\b/i.test(line)) hasCacheOp = true

          // useEffect の終了を検出
          if (braceDepth <= 0 && i > effectStart) {
            if (hasAsync && hasStoreUpdate && hasCacheOp) {
              violations.push(
                `${relPath}:${effectStart}: useEffect 内に非同期+store更新+キャッシュ操作が密結合`,
              )
            }
            inEffect = false
          }
        }
      }
    }

    expect(violations, `副作用チェーンが検出されました:\n${violations.join('\n')}`).toEqual([])
  })
})
