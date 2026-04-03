/**
 * Query Access Audit — クエリアクセス経路の棚卸し
 *
 * presentation から query を発行する入口が規定どおりか、
 * executor.execute() 直呼びが増えていないか、
 * 正規経路 / 互換経路 / 禁止経路の件数を定量化する。
 *
 * 既存の presentationIsolationGuard が「違反禁止」に集中しているのに対し、
 * この監査は「今どの access route が何本生きているか」を観測する。
 *
 * @audit Query Access Route Inventory
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'

// ── 経路分類 ──

interface RouteCount {
  /** useQueryWithHandler 経由（正規経路） */
  queryWithHandler: string[]
  /** QueryHandler 定義（application/queries/handlers/） */
  queryHandlers: string[]
  /** PairedQueryHandler 定義（createPairedHandler 利用 + baseName 付き） */
  pairHandlers: string[]
  /** Screen Plan hook 定義（application/hooks/use*Plan.ts） */
  screenPlanHooks: string[]
  /** comparisonAccessors 経由（正規経路） */
  comparisonAccessor: string[]
  /** facade / bundle hook 経由（useQueryBundle, useFreePeriodAnalysisBundle 等） */
  facadeHook: string[]
  /** bundle hook 定義ファイル（実装側） */
  bundleHookDef: string[]
  /** executor.execute() 直呼び（要注意） */
  executorDirect: string[]
  /** useAsyncQuery 直 import（互換経路） */
  asyncQueryDirect: string[]
  /** infrastructure/duckdb 直 import（禁止経路） */
  infraDuckdbDirect: string[]
  /** weather hook 使用（application 経由） */
  weatherRoutes: string[]
  /** presentation から weather infrastructure 直参照（禁止経路） */
  weatherInfraDirect: string[]
}

/** features/{feature}/ui/ 配下のファイルを収集する */
function collectFeatureUiFiles(srcDir: string): string[] {
  const featuresDir = path.join(srcDir, 'features')
  if (!fs.existsSync(featuresDir)) return []
  return fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const uiDir = path.join(featuresDir, d.name, 'ui')
      return fs.existsSync(uiDir) ? collectTsFiles(uiDir) : []
    })
}

/** bundle hook の検出パターン */
const BUNDLE_HOOK_PATTERN =
  /use(?:ComparisonContext|QueryBundle|ComparisonBundle|ChartInteractionBundle|FreePeriodAnalysisBundle)/

function inventoryQueryRoutes(): RouteCount {
  const routes: RouteCount = {
    queryWithHandler: [],
    queryHandlers: [],
    pairHandlers: [],
    screenPlanHooks: [],
    comparisonAccessor: [],
    facadeHook: [],
    bundleHookDef: [],
    executorDirect: [],
    asyncQueryDirect: [],
    infraDuckdbDirect: [],
    weatherRoutes: [],
    weatherInfraDirect: [],
  }

  // 1. QueryHandler 定義の棚卸し（サブディレクトリに分散配置）
  const queriesDir = path.join(SRC_DIR, 'application/queries')
  if (fs.existsSync(queriesDir)) {
    const allFiles = collectTsFiles(queriesDir)
    routes.queryHandlers = allFiles.filter((f) => f.includes('Handler')).map((f) => rel(f))

    // PairedQueryHandler 検出（createPairedHandler を利用して baseName を持つ handler）
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (/createPairedHandler\(/.test(content) && !file.endsWith('createPairedHandler.ts')) {
        routes.pairHandlers.push(rel(file))
      }
    }
  }

  // 1.5. Screen Plan hook 検出（application/hooks/ + presentation/ + features/ の use*Plan.ts）
  const planSearchRoots = [
    path.join(SRC_DIR, 'application/hooks'),
    path.join(SRC_DIR, 'presentation'),
    ...(fs.existsSync(path.join(SRC_DIR, 'features'))
      ? fs
          .readdirSync(path.join(SRC_DIR, 'features'), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => path.join(SRC_DIR, 'features', d.name))
      : []),
  ]
  for (const root of planSearchRoots) {
    if (!fs.existsSync(root)) continue
    for (const file of collectTsFiles(root)) {
      const basename = path.basename(file, '.ts')
      if (/^use\w+Plan$/.test(basename) && !file.includes('.test.')) {
        routes.screenPlanHooks.push(rel(file))
      }
    }
  }

  // 2. presentation/ + features/*/ui/ のアクセスパターンを棚卸し
  const presFiles = [
    ...collectTsFiles(path.join(SRC_DIR, 'presentation')),
    ...collectFeatureUiFiles(SRC_DIR),
  ]
  for (const file of presFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const relPath = rel(file)

    if (/useQueryWithHandler/.test(content)) {
      routes.queryWithHandler.push(relPath)
    }
    if (/(?:getPrevYearDailyValue|getPrevYearDailySales)/.test(content)) {
      routes.comparisonAccessor.push(relPath)
    }
    if (BUNDLE_HOOK_PATTERN.test(content)) {
      routes.facadeHook.push(relPath)
    }
    if (/executor\.execute\(/.test(content)) {
      routes.executorDirect.push(relPath)
    }
    if (/from\s+['"].*useAsyncQuery/.test(content)) {
      routes.asyncQueryDirect.push(relPath)
    }
    if (/from\s+['"]@\/infrastructure\/duckdb/.test(content)) {
      routes.infraDuckdbDirect.push(relPath)
    }
    if (/useWeather(?:Data|Forecast|HourlyOnDemand|Correlation)/.test(content)) {
      routes.weatherRoutes.push(relPath)
    }
    if (/from\s+['"]@\/infrastructure\/.*(?:weather|etrn)/.test(content)) {
      routes.weatherInfraDirect.push(relPath)
    }
  }

  // 3. application/ のアクセスパターンも棚卸し
  const appFiles = [
    ...collectTsFiles(path.join(SRC_DIR, 'application/hooks')),
    ...collectTsFiles(path.join(SRC_DIR, 'application/usecases')),
  ]
  for (const file of appFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const relPath = rel(file)

    if (/(?:getPrevYearDailyValue|getPrevYearDailySales)/.test(content)) {
      routes.comparisonAccessor.push(relPath)
    }
    // bundle hook 定義の検出
    if (
      /export function use(?:QueryBundle|ComparisonBundle|ChartInteractionBundle|FreePeriodAnalysisBundle)/.test(
        content,
      )
    ) {
      routes.bundleHookDef.push(relPath)
    }
  }

  return routes
}

// ── Tests ──

describe('Query Access Audit — クエリアクセス経路棚卸し', () => {
  const routes = inventoryQueryRoutes()

  it('正規経路が存在する', () => {
    // QueryHandler が少なくとも 1 つ存在
    expect(
      routes.queryHandlers.length,
      'QueryHandler が 0 件。application/queries/handlers/ に定義が必要です。',
    ).toBeGreaterThan(0)
  })

  it('禁止経路（infrastructure/duckdb 直 import）が presentation に 0 件', () => {
    expect(
      routes.infraDuckdbDirect,
      `presentation/ から infrastructure/duckdb への直接 import: ${routes.infraDuckdbDirect.join(', ')}`,
    ).toEqual([])
  })

  it('executor.execute() 直呼びが presentation に増えていない', () => {
    // 現状の executor 直呼び数を上限として凍結
    // 新規追加は QueryHandler 経由にすべき
    const MAX_EXECUTOR_DIRECT = 5
    expect(
      routes.executorDirect.length,
      `executor.execute() 直呼びが ${routes.executorDirect.length} 件（上限 ${MAX_EXECUTOR_DIRECT}）: ${routes.executorDirect.join(', ')}`,
    ).toBeLessThanOrEqual(MAX_EXECUTOR_DIRECT)
  })

  it('useAsyncQuery 直 import が presentation に 0 件', () => {
    expect(
      routes.asyncQueryDirect,
      `useAsyncQuery の直接 import: ${routes.asyncQueryDirect.join(', ')}`,
    ).toEqual([])
  })

  it('Weather hook が application 経由のみで使用されている', () => {
    expect(
      routes.weatherInfraDirect,
      `presentation/ から weather infrastructure への直接 import: ${routes.weatherInfraDirect.join(', ')}`,
    ).toEqual([])
  })

  it('useQueryWithHandler の参照先 Handler が全件存在する', () => {
    const handlerNames = new Set<string>()
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const handlerPattern = /useQueryWithHandler\(\s*(\w+Handler)/g
    for (const file of presFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      let match
      while ((match = handlerPattern.exec(content)) !== null) {
        handlerNames.add(match[1])
      }
    }
    const handlerFileNames = new Set(routes.queryHandlers.map((f) => path.basename(f, '.ts')))
    const missing = [...handlerNames].filter((name) => !handlerFileNames.has(name))
    expect(missing, `参照されているが存在しない Handler: ${missing.join(', ')}`).toEqual([])
  })

  it('未使用 QueryHandler の棚卸し（report-only）', () => {
    // report-only: 未使用 Handler は将来利用の可能性があるため警告のみ
    const usedHandlers = new Set<string>()
    const allFiles = [
      ...collectTsFiles(path.join(SRC_DIR, 'presentation')),
      ...collectTsFiles(path.join(SRC_DIR, 'application/hooks')),
      ...collectFeatureUiFiles(SRC_DIR),
    ]
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const handler of routes.queryHandlers) {
        const handlerName = path.basename(handler, '.ts')
        if (content.includes(handlerName)) {
          usedHandlers.add(handlerName)
        }
      }
    }
    // 棚卸し結果をスナップショットに含める（テスト失敗にはしない）
    expect(usedHandlers.size).toBeGreaterThan(0)
  })

  it('経路レポートを生成する', () => {
    const reportDir = path.resolve(__dirname, '../../../../references/02-status/generated')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        queryHandlers: routes.queryHandlers.length,
        pairHandlers: routes.pairHandlers.length,
        screenPlanHooks: routes.screenPlanHooks.length,
        正規経路_queryWithHandler: routes.queryWithHandler.length,
        正規経路_comparisonAccessor: routes.comparisonAccessor.length,
        正規経路_facadeHook: routes.facadeHook.length,
        bundleHookDef: routes.bundleHookDef.length,
        要注意_executorDirect: routes.executorDirect.length,
        互換経路_asyncQueryDirect: routes.asyncQueryDirect.length,
        禁止経路_infraDuckdbDirect: routes.infraDuckdbDirect.length,
        weather_applicationHook: routes.weatherRoutes.length,
        禁止経路_weatherInfraDirect: routes.weatherInfraDirect.length,
      },
      detail: routes,
    }

    const jsonPath = path.join(reportDir, 'query-access-audit.json')
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')

    // Markdown
    const md = [
      '# Query Access Audit Report',
      '',
      `> Generated: ${report.timestamp}`,
      '',
      '## Route Summary',
      '',
      '| 経路種別 | 件数 | 状態 |',
      '|---|---|---|',
      `| QueryHandler 定義 | ${routes.queryHandlers.length} | 基盤 |`,
      `| PairedQueryHandler（pair 化済み） | ${routes.pairHandlers.length} | 基盤 |`,
      `| Screen Plan hook（plan 化済み） | ${routes.screenPlanHooks.length} | 基盤 |`,
      `| useQueryWithHandler（正規） | ${routes.queryWithHandler.length} | 正規 |`,
      `| comparisonAccessors（正規） | ${routes.comparisonAccessor.length} | 正規 |`,
      `| facade / bundle hook 使用（正規） | ${routes.facadeHook.length} | 正規 |`,
      `| bundle hook 定義 | ${routes.bundleHookDef.length} | 基盤 |`,
      `| executor.execute 直呼び（要注意） | ${routes.executorDirect.length} | 要注意 |`,
      `| useAsyncQuery 直 import（互換） | ${routes.asyncQueryDirect.length} | 互換 |`,
      `| infrastructure/duckdb 直 import（禁止） | ${routes.infraDuckdbDirect.length} | 禁止 |`,
      '',
      '## Detail',
      '',
      ...Object.entries(routes)
        .filter(([, files]) => (files as string[]).length > 0)
        .map(([name, files]) =>
          [`### ${name}`, '', ...(files as string[]).map((f: string) => `- ${f}`), ''].join('\n'),
        ),
    ].join('\n')

    const mdPath = path.join(reportDir, 'query-access-audit.md')
    fs.writeFileSync(mdPath, md, 'utf-8')

    expect(fs.existsSync(jsonPath)).toBe(true)
  })
})

// ── QueryHandler 名の一意性ガード ──

describe('QueryHandler name 一意性', () => {
  it('全 Handler の name プロパティが重複しない', () => {
    const handlerDir = path.join(SRC_DIR, 'application/queries')
    const handlerFiles = collectTsFiles(handlerDir).filter((f) => f.endsWith('Handler.ts'))

    const names: { name: string; file: string }[] = []
    const namePattern = /name:\s*'([^']+)'/

    for (const file of handlerFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const match = content.match(namePattern)
      if (match) {
        names.push({ name: match[1], file: rel(file) })
      }
    }

    // 重複チェック
    const seen = new Map<string, string>()
    const duplicates: string[] = []
    for (const { name, file } of names) {
      if (seen.has(name)) {
        duplicates.push(`'${name}': ${seen.get(name)} と ${file}`)
      }
      seen.set(name, file)
    }

    expect(
      duplicates,
      `QueryHandler name が重複しています:\n${duplicates.join('\n')}\n` +
        'handler.name はプロファイリング・ログで識別子として使われるため一意にしてください。',
    ).toEqual([])
  })

  it('Handler ファイル数が最低限存在する', () => {
    const handlerDir = path.join(SRC_DIR, 'application/queries')
    const handlerFiles = collectTsFiles(handlerDir).filter((f) => f.endsWith('Handler.ts'))
    expect(handlerFiles.length).toBeGreaterThanOrEqual(20)
  })

  it('Handler の name プロパティがファイル名と一致する（命名規約）', () => {
    const handlerDir = path.join(SRC_DIR, 'application/queries')
    const handlerFiles = collectTsFiles(handlerDir).filter((f) => f.endsWith('Handler.ts'))
    const violations: string[] = []
    const namePattern = /name:\s*'([^']+)'/

    for (const file of handlerFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const match = content.match(namePattern)
      if (!match) continue

      const handlerName = match[1]
      const fileName = path.basename(file, '.ts').replace('Handler', '')
      if (handlerName !== fileName) {
        violations.push(`${rel(file)}: name='${handlerName}' ≠ fileName='${fileName}'`)
      }
    }

    expect(
      violations,
      `QueryHandler name がファイル名と一致しません:\n${violations.join('\n')}\n` +
        '→ name は PascalCase でファイル名から Handler サフィックスを除いたものにしてください。',
    ).toEqual([])
  })
})

// ── store_day_summary 依存可視化 ──

describe('store_day_summary 依存トラッキング', () => {
  it('store_day_summary を参照するクエリモジュール数が上限を超えない', () => {
    const queriesDir = path.join(SRC_DIR, 'infrastructure/duckdb/queries')
    const files = collectTsFiles(queriesDir)
    const MAX_CONSUMERS = 11

    const consumers: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('store_day_summary') || content.includes('storeDaySummary')) {
        consumers.push(rel(file))
      }
    }

    expect(
      consumers.length,
      `store_day_summary の依存モジュール数が ${consumers.length} 件（上限: ${MAX_CONSUMERS}）。\n` +
        `依存ファイル:\n${consumers.join('\n')}\n` +
        '→ 新規依存を追加する前に、既存の QueryHandler 経由でアクセスできないか検討してください。',
    ).toBeLessThanOrEqual(MAX_CONSUMERS)
  })
})
