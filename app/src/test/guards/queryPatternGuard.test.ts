/**
 * Query Pattern Guard — Screen Runtime 規格の構造検証
 *
 * 実装形（callsite の .sort() 有無）ではなく、保証したい性質をテストする。
 *
 * @guard H3 query input 正規化必須 — canonicalize 統合を検証
 * @guard H2 比較は pair/bundle 契約 — isPrevYear handler 数を追跡
 * @guard H4 component に acquisition logic 禁止 — presentation direct query 数を追跡
 * @guard H5 visible-only query は plan でのみ宣言 — collapsible hidden fetch 防止
 * ルール定義: architectureRules.ts (AR-STRUCT-QUERY-PATTERN)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, extractImports, rel } from '../guardTestHelpers'
import { nonPairableConsumers } from '../allowlists'
import { pairJustifiedSingle } from '../allowlists/performance'

const rule = getRuleById('AR-STRUCT-QUERY-PATTERN')!

// ── INV-RUN-01: Canonical Integration ──

describe('INV-RUN-01: useQueryWithHandler は canonicalizeQueryInput を経由する', () => {
  const hookFile = path.join(SRC_DIR, 'application/hooks/useQueryWithHandler.ts')

  it('canonicalizeQueryInput を import している', () => {
    const content = fs.readFileSync(hookFile, 'utf-8')
    expect(content).toContain('import { canonicalizeQueryInput }')
  })

  it('inputKey 算出で canonicalizeQueryInput を使用している', () => {
    const content = fs.readFileSync(hookFile, 'utf-8')
    expect(content).toContain('canonicalizeQueryInput(input)')
  })
})

// ── INV-RUN-02: isPrevYear Handler Audit ──

describe('INV-RUN-02: isPrevYear handler 棚卸し', () => {
  const queriesDir = path.join(SRC_DIR, 'application/queries')

  it('isPrevYear を含む handler が存在しない（全件卒業済み）', () => {
    const handlerFiles = collectTsFiles(queriesDir).filter(
      (f) => f.endsWith('Handler.ts') && !f.endsWith('.test.ts'),
    )

    const filesWithIsPrevYear: string[] = []
    for (const file of handlerFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (/isPrevYear\??:\s*(boolean|true|false)/.test(content)) {
        filesWithIsPrevYear.push(rel(file))
      }
    }

    expect(filesWithIsPrevYear, formatViolationMessage(rule, filesWithIsPrevYear)).toEqual([])
  })
})

// ── INV-RUN-03: Presentation Direct Query Count ──

describe('INV-RUN-03: presentation 層の useQueryWithHandler 直接呼び出し（追跡）', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')
  const featuresDir = path.join(SRC_DIR, 'features')

  it('presentation/ と features/*/ui/ の直接呼び出し数を記録する', () => {
    const presentationFiles = collectTsFiles(presentationDir)
    const featureUiFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir).filter((f) => f.includes('/ui/'))
      : []

    const allFiles = [...presentationFiles, ...featureUiFiles].filter(
      (f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    )

    const filesWithDirectQuery: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('useQueryWithHandler')) {
        filesWithDirectQuery.push(rel(file))
      }
    }

    // Gate 2: CategoryPerformanceChart (-2), StorePIComparisonChart (-1) が plan 化済み
    // この数値は Gate 4 で 0 にすることが目標。
    console.log(`[INV-RUN-03] presentation direct query files: ${filesWithDirectQuery.length}`)

    // Gate 3 完了: 22→0。全 presentation direct query を Screen Plan hook に移行完了。
    expect(filesWithDirectQuery.length, formatViolationMessage(rule, filesWithDirectQuery)).toBe(0)
  })
})

// ── INV-RUN-02: pair handler 消費側の整合性 ──

describe('INV-RUN-02: pair handler 消費側の整合性', () => {
  it('nonPairableConsumers は pairJustifiedSingle と一致する（pairExceptionDesign は全件卒業済み）', () => {
    const expected = [...pairJustifiedSingle].map((e) => e.path).sort()
    const actual = [...nonPairableConsumers].map((e) => e.path).sort()
    const violations = actual.filter((p) => !expected.includes(p))
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
    expect(actual).toEqual(expected)
  })

  it('分類サマリを出力する', () => {
    console.log(`[INV-RUN-02 pair] justified-single: ${pairJustifiedSingle.length}`)
    expect(pairJustifiedSingle.length).toBe(nonPairableConsumers.length)
  })
})

// ── INV-RUN-02: Pair Handler Count Ratchet ──

describe('INV-RUN-02: pair handler count ラチェット', () => {
  const queriesDir = path.join(SRC_DIR, 'application/queries')

  it('createPairedHandler で生成された pair handler が減少していないこと', () => {
    const allFiles = collectTsFiles(queriesDir).filter((f) => !f.endsWith('.test.ts'))

    let pairHandlerCount = 0
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('createPairedHandler(') && !file.endsWith('createPairedHandler.ts')) {
        pairHandlerCount++
      }
    }

    console.log(`[INV-RUN-02] pair handler count: ${pairHandlerCount}`)

    // Gate 3: 13 pair handler（既存 1 + 新規 12）。MovingAverageHandler は BaseQueryInput 非準拠のためスキップ。
    expect(
      pairHandlerCount,
      formatViolationMessage(rule, [`pairHandlerCount: ${pairHandlerCount} (expected >= 13)`]),
    ).toBeGreaterThanOrEqual(13)
  })
})

// ── INV-RUN-04: Screen Plan Hook Count Ratchet ──

describe('INV-RUN-04: Screen Plan hook count ラチェット', () => {
  const plansDir = path.join(SRC_DIR, 'application/hooks/plans')
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('Screen Plan hook が減少していないこと', () => {
    // plans/ ディレクトリ内の plan hook（shared）
    const planFiles = fs.existsSync(plansDir)
      ? collectTsFiles(plansDir).filter((f) => !f.endsWith('.test.ts') && f.includes('Plan'))
      : []

    // application/hooks/ 直下の plan hook（useCategoryBenchmarkPlan 等）
    const directPlanFiles = collectTsFiles(hooksDir)
      .filter((f) => !f.endsWith('.test.ts') && !f.includes('/plans/') && !f.includes('/duckdb/'))
      .filter((f) => path.basename(f).includes('Plan'))

    // features/ 内の plan hook（feature ownership 移行済み）
    const featuresDir = path.join(SRC_DIR, 'features')
    const featurePlanFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir).filter(
          (f) => !f.endsWith('.test.ts') && f.includes('/plans/') && f.includes('Plan'),
        )
      : []

    const totalPlanHooks = planFiles.length + directPlanFiles.length + featurePlanFiles.length

    console.log(
      `[INV-RUN-04] Screen Plan hooks: ${totalPlanHooks} (plans/: ${planFiles.length}, direct: ${directPlanFiles.length}, features/: ${featurePlanFiles.length})`,
    )

    // 2026-04-05: category plans を features/ に移行。shared 19→13 + features 6 = 同数維持
    expect(
      totalPlanHooks,
      formatViolationMessage(rule, [`totalPlanHooks: ${totalPlanHooks} (expected >= 22)`]),
    ).toBeGreaterThanOrEqual(22)
  })
})

// ── Gate 4: Base Handler Import Guard ──

describe('INV-RUN-02: pair 化済み handler の base import 追跡', () => {
  /**
   * pair handler が存在するのに base handler を直接 import している消費側ファイルを検出する。
   * 許容リスト（nonPairableConsumers）に登録された例外を除き、増加を防止する。
   */
  const pairableHandlerNames = [
    'hourlyAggregationHandler',
    'hourDowMatrixHandler',
    'categoryTimeRecordsHandler',
    'categoryHourlyHandler',
    'categoryDailyTrendHandler',
    'storeCategoryPIHandler',
    'categoryDiscountHandler',
    'storeDaySummaryHandler',
    'aggregatedRatesHandler',
    'distinctDayCountHandler',
    'categoryMixWeeklyHandler',
    'dailyCumulativeHandler',
    'levelAggregationHandler',
  ]

  it('pair 化済み base handler を直接 import する消費側が増加していないこと', () => {
    const dirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'features'),
      path.join(SRC_DIR, 'application/hooks'),
    ]

    const allFiles = dirs
      .filter((d) => fs.existsSync(d))
      .flatMap((d) => collectTsFiles(d))
      .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
      // plan hooks は base handler の正規アクセスポイントのため除外
      .filter((f) => !f.includes('/hooks/plans/'))

    const nonPairablePaths = new Set(nonPairableConsumers.map((e) => e.path))

    const violations: string[] = []
    for (const file of allFiles) {
      const relPath = rel(file)
      if (nonPairablePaths.has(relPath)) continue
      if (file.endsWith('PairHandler.ts')) continue
      // plan hook は base handler を直接 import する（plan の責務）
      if (relPath.includes('/plans/') && relPath.includes('Plan')) continue

      const content = fs.readFileSync(file, 'utf-8')
      // コメント行を除去してから検査
      const codeOnly = content
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
        .join('\n')
      for (const handler of pairableHandlerNames) {
        // import 文の中で base handler を直接 import しているか検出
        // import { handler } from '...' または import { handler, ... } from '...'
        if (
          codeOnly.includes(`import`) &&
          new RegExp(`\\b${handler}\\b`).test(codeOnly) &&
          // from '...Handler' パスからの import を検出（re-export や型 import も含む）
          codeOnly.includes(`Handler`)
        ) {
          violations.push(`${relPath}: ${handler}`)
        }
      }
    }

    console.log(`[Gate 4] base handler 直接 import 消費側: ${violations.length}`)
    if (violations.length > 0) {
      console.log(`  対象:\n  ${violations.join('\n  ')}`)
    }

    // 全消費側が nonPairableConsumers に分類済み。新規の base handler import を防止する。
    expect(violations.length, formatViolationMessage(rule, violations)).toBeLessThanOrEqual(0)
  })
})

// ── INV-RUN-05: Hidden Fetch Guard ──

describe('INV-RUN-05: collapsible ChartCard の hidden fetch 防止', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')
  const featuresDir = path.join(SRC_DIR, 'features')

  it('collapsible + useQueryWithHandler を持つ component は onVisibilityChange を実装している', () => {
    const presentationFiles = collectTsFiles(presentationDir).filter((f) => f.endsWith('.tsx'))
    const featureUiFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir)
          .filter((f) => f.includes('/ui/'))
          .filter((f) => f.endsWith('.tsx'))
      : []

    const allFiles = [...presentationFiles, ...featureUiFiles].filter(
      (f) => !f.endsWith('.test.tsx'),
    )

    const violations: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const hasCollapsible = content.includes('collapsible')
      const hasDirectQuery = content.includes('useQueryWithHandler')

      if (hasCollapsible && hasDirectQuery) {
        const hasVisibilityChange = content.includes('onVisibilityChange')
        if (!hasVisibilityChange) {
          violations.push(rel(file))
        }
      }
    }

    console.log(
      `[INV-RUN-05] collapsible + useQueryWithHandler の component: ${violations.length === 0 ? '全件 onVisibilityChange 実装済み' : violations.length + ' 件の違反'}`,
    )

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ── P6-2: Plan-Bridge Prohibition Guard ──

describe('P6-2: Screen Plan hook が presentation 層を import しない', () => {
  const plansDir = path.join(SRC_DIR, 'application/hooks/plans')
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('plans/ ディレクトリの hook が @/presentation/ を import しない', () => {
    if (!fs.existsSync(plansDir)) return

    const planFiles = collectTsFiles(plansDir)
    const violations: string[] = []

    for (const file of planFiles) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('application/hooks/ 直下の plan hook が @/presentation/ を import しない', () => {
    const directPlanFiles = collectTsFiles(hooksDir)
      .filter((f) => !f.includes('/plans/') && !f.includes('/duckdb/'))
      .filter((f) => path.basename(f).includes('Plan'))

    const violations: string[] = []

    for (const file of directPlanFiles) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ── P6-2: Plan Hook Infrastructure Isolation Guard ──

describe('P6-2: Screen Plan hook が infrastructure 層を import しない', () => {
  const plansDir = path.join(SRC_DIR, 'application/hooks/plans')

  it('plans/ ディレクトリの hook が @/infrastructure/ を import しない', () => {
    if (!fs.existsSync(plansDir)) return

    const planFiles = collectTsFiles(plansDir)
    const violations: string[] = []

    for (const file of planFiles) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ── P6-3: Compat Re-export Prohibition Guard ──

describe('P6-3: 退役済み re-export ファイルが復活していない', () => {
  const retiredFiles = [
    'application/hooks/useForecast.ts',
    'application/hooks/useBudgetChartData.ts',
    'application/usecases/dailySalesTransform.ts',
    'presentation/pages/Admin/useMonthDataManagement.ts',
    'presentation/pages/Insight/InsightTabBudget.vm.ts',
    'presentation/components/charts/IntegratedSalesChartLogic.ts',
    'application/hooks/duckdb/useJsAggregationQueries.ts',
  ]

  it('退役済み re-export ファイルが存在しない', () => {
    const existing: string[] = []
    for (const file of retiredFiles) {
      if (fs.existsSync(path.join(SRC_DIR, file))) {
        existing.push(file)
      }
    }

    expect(existing, formatViolationMessage(rule, existing)).toEqual([])
  })
})
