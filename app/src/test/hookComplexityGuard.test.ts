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
    ['application/hooks/duckdb/purchaseComparisonBuilders.ts', 600],
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

  // useMemo が多い既存ファイルの許容リスト（現在値で凍結、次回改修時に分割義務）
  const allowlist: Record<string, number> = {
    'application/hooks/duckdb/useJsAggregationQueries.ts': 10,
    'application/hooks/duckdb/useCtsQueries.ts': 10,
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

    expect(
      violations,
      `useMemo 過多のファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R11: hook ファイルの useState カウント上限 ──────────────

describe('R11: hooks/ の useState 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // useState が多い既存ファイルの許容リスト（凍結）
  const allowlist: Record<string, number> = {
    'application/hooks/useDuckDB.ts': 10,
    'application/hooks/useAutoImport.ts': 9,
    'application/hooks/usePersistence.ts': 7,
    'application/hooks/useAutoBackup.ts': 7,
    'application/hooks/useMetricBreakdown.ts': 6,
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

  // 既存で超過するファイルの許容リスト（凍結。次回改修時に分割義務）
  const allowlist: Record<string, number> = {
    'application/hooks/duckdb/purchaseComparisonBuilders.ts': 600,
    'application/hooks/duckdb/categoryBenchmarkLogic.ts': 450,
    'application/hooks/duckdb/useCtsQueries.ts': 350,
    'application/hooks/useDuckDB.ts': 310,
    'application/hooks/duckdb/useJsAggregationQueries.ts': 280,
    'application/hooks/duckdb/jsAggregationLogic.ts': 250,
    'application/hooks/duckdb/usePurchaseComparisonQuery.ts': 300,
    'application/hooks/duckdb/categoryBoxPlotLogic.ts': 250,
    'application/hooks/useMetricBreakdown.ts': 250,
    'application/hooks/useAutoImport.ts': 230,
    'application/hooks/usePrevYearMonthlyKpi.ts': 220,
    'application/hooks/useComparisonModule.ts': 210,
    'application/hooks/useRawDataFetch.ts': 210,
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

  // 既存の大型コンポーネントの上限（現在行数 + 5% で凍結）
  const componentLimits: [string, number][] = [
    ['presentation/pages/Dashboard/widgets/ConditionDetailPanels.tsx', 1300],
    ['presentation/pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx', 1050],
    ['presentation/components/charts/StructuralOverviewChart.tsx', 800],
    ['presentation/components/charts/CvTimeSeriesChart.tsx', 720],
    ['presentation/components/charts/TimeSlotChart.tsx', 660],
    ['presentation/pages/Dashboard/widgets/DayDetailModal.tsx', 620],
    ['presentation/pages/Admin/StorageManagementTab.tsx', 620],
    ['presentation/pages/Forecast/ForecastChartsCustomer.tsx', 600],
    ['presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx', 600],
    ['presentation/components/charts/BudgetVsActualChart.tsx', 580],
    ['presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx', 570],
    ['presentation/pages/Dashboard/widgets/ForecastTools.tsx', 570],
    ['presentation/pages/Insight/InsightTabForecast.tsx', 570],
    ['presentation/components/charts/EstimatedInventoryDetailChart.tsx', 570],
    ['presentation/components/charts/PerformanceIndexChart.tsx', 560],
    ['presentation/pages/Dashboard/widgets/ConditionSummary.tsx', 550],
    ['presentation/pages/Dashboard/widgets/HourlyChart.tsx', 550],
    ['presentation/pages/Insight/InsightTabBudget.tsx', 540],
    ['presentation/components/charts/CategoryBoxPlotChart.tsx', 530],
    ['presentation/components/charts/YoYVarianceChart.tsx', 520],
    ['presentation/components/charts/StoreHourlyChart.tsx', 510],
    ['presentation/pages/Dashboard/widgets/StoreKpiTableInner.tsx', 490],
    ['presentation/components/charts/SensitivityDashboard.tsx', 490],
    ['presentation/pages/Reports/ReportSummaryGrid.tsx', 490],
    ['presentation/pages/Category/CategoryTotalView.tsx', 490],
    ['presentation/components/charts/CustomerScatterChart.tsx', 480],
    ['presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx', 480],
    ['presentation/components/charts/CategoryTrendChart.tsx', 470],
    ['presentation/pages/Daily/DailyPage.tsx', 460],
    ['presentation/components/charts/CategoryHierarchyExplorer.tsx', 450],
    ['presentation/components/charts/CategoryPerformanceChart.tsx', 450],
    ['presentation/components/charts/DailySalesChartBody.tsx', 450],
    ['presentation/components/charts/SalesPurchaseComparisonChart.tsx', 430],
    ['presentation/pages/Admin/AdminPage.tsx', 440],
    ['presentation/pages/Admin/ImportHistoryTab.tsx', 460],
    ['presentation/pages/Dashboard/DashboardPage.tsx', 460],
    ['presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx', 430],
  ]

  it.each(componentLimits)('%s は %d 行以下', (relPath, maxLines) => {
    const filePath = path.join(SRC_DIR, relPath)
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(
      lineCount,
      `${relPath} は ${lineCount} 行 (上限: ${maxLines})。分割してから機能追加すること`,
    ).toBeLessThanOrEqual(maxLines)
  })

  it('未登録の Presentation .tsx ファイルが 400 行以下', () => {
    const registeredPaths = new Set(componentLimits.map(([p]) => p))
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      // styles, stories ファイルは除外
      if (file.includes('.styles.') || file.includes('.stories.')) continue
      const relPath = rel(file)
      if (registeredPaths.has(relPath)) continue

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

    expect(
      violations,
      `facade に分岐ロジックが混入しています:\n${violations.join('\n')}`,
    ).toEqual([])
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

    expect(
      violations,
      `副作用チェーンが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
