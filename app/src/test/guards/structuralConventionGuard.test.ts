/**
 * 構造規約ガードテスト
 *
 * バレル移行・仮実装配置・機能スライス間依存・ctx 提供データの重複取得・
 * サブ分析パネルのデータソースを検証する。
 *
 * @guard F1 バレルで後方互換
 * @guard F4 配置はパスで決まる
 * @guard F9 Raw データは唯一の真実源
 * ルール定義: architectureRules.ts (AR-STRUCT-CONVENTION)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, extractImports, rel as relativePath } from '../guardTestHelpers'
import { ctxHook, buildAllowlistSet } from '../allowlists'
import type { AllowlistEntry } from '../allowlists'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  applicationToInfrastructure,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  vmReactImport,
  reactImportExcludeDirs,
  sideEffectChain,
  infraLargeFiles,
  domainLargeFiles,
  usecasesLargeFiles,
  isPrevYearHandlers,
  pairExceptionDesign,
  pairJustifiedSingle,
} from '../allowlists'

// ─── ctx 提供データの重複取得禁止 ────────────────────────

/** ctx で提供されるデータの取得 hook 一覧 */
const CTX_PROVIDED_HOOKS = [
  'useWeatherData', // → ctx.weatherDaily
]

const CTX_HOOK_ALLOWLIST = buildAllowlistSet(ctxHook)

// ─── サブバレル移行ルール ────────────────────────────────

const SUB_BARREL_RULES: {
  mainBarrel: string
  barrelDir: string
  maxViolations: number
}[] = [
  { mainBarrel: '@/domain/models', barrelDir: 'domain/models', maxViolations: 0 },
  {
    mainBarrel: '@/presentation/components/common',
    barrelDir: 'presentation/components/common',
    maxViolations: 0,
  },
  { mainBarrel: '@/application/hooks', barrelDir: 'application/hooks', maxViolations: 0 },
]

// ─── テスト ──────────────────────────────────────────────

describe('Structural Convention Guard', () => {
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

  it('features/ への外部 import は barrel 経由のみ（deep import 禁止）', () => {
    const featuresDir = path.join(SRC_DIR, 'features')
    if (!fs.existsSync(featuresDir)) return

    // features/ 配下のスライス名を収集
    const sliceNames = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)

    // features/ 外の全ファイルをスキャン
    const allFiles = collectTsFiles(SRC_DIR)
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      // features/ 内部のファイルは対象外（内部 import は自由）
      if (relPath.startsWith('features/')) continue
      // テスト・stories は対象外
      if (relPath.includes('__tests__/') || relPath.startsWith('stories/')) continue
      // @temporary backward-compat re-exports は対象外（移行完了時に削除）
      if (relPath.startsWith('application/comparison/')) continue
      // useComparisonModule re-export（features/comparison/ 移行の一部）
      if (relPath === 'application/hooks/useComparisonModule.ts') continue

      const imports = extractImports(file)
      for (const imp of imports) {
        for (const slice of sliceNames) {
          const barrelPath = `@/features/${slice}`
          // barrel 自体は OK（例: @/features/sales）
          if (imp === barrelPath) continue
          // deep import は NG（例: @/features/sales/domain/salesMetrics）
          if (imp.startsWith(`${barrelPath}/`)) {
            violations.push(
              `${relPath}: ${imp} — features/${slice} への deep import 禁止。barrel 経由 (@/features/${slice}) を使用してください`,
            )
          }
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('全 feature slice に manifest.ts が存在する', () => {
    const featuresDir = path.join(SRC_DIR, 'features')
    if (!fs.existsSync(featuresDir)) return

    const sliceDirs = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)

    const violations: string[] = []
    for (const slice of sliceDirs) {
      const manifestPath = path.join(featuresDir, slice, 'manifest.ts')
      if (!fs.existsSync(manifestPath)) {
        violations.push(`features/${slice}/manifest.ts が存在しません`)
      }
    }

    expect(violations, `manifest.ts 未作成:\n${violations.join('\n')}`).toEqual([])
  })

  // ─── 仮実装ファイル検出ガード ──────────────────────────

  it('_prototypes/ 外に Demo/Prototype ファイルが存在しない', () => {
    const srcDir = SRC_DIR
    const files = collectTsFiles(srcDir)
    const violations: string[] = []

    const PROTOTYPE_NAME_PATTERN = /(Demo|Prototype)\.(ts|tsx)$/

    for (const file of files) {
      const rel = relativePath(file)
      // _prototypes/ ディレクトリ内は許可
      if (rel.includes('_prototypes/')) continue
      // テストファイルは対象外（collectTsFiles で除外済みだが念のため）
      if (rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) continue
      // stories は対象外
      if (rel.startsWith('stories/')) continue

      if (PROTOTYPE_NAME_PATTERN.test(path.basename(file))) {
        violations.push(
          `${rel}: 仮実装ファイルが本番パスにあります。_prototypes/ に配置するか、正式名にリネームしてレイヤー違反を解消してください`,
        )
      }
    }

    expect(violations).toEqual([])
  })

  // ─── サブバレル移行ガード ─────────────────────────────

  for (const rule of SUB_BARREL_RULES) {
    it(`${rule.mainBarrel} のメインバレル直接 import を禁止（サブバレル経由に移行済み）`, () => {
      const files = collectTsFiles(SRC_DIR)
      const violations: string[] = []
      const mainBarrelPattern = new RegExp(
        `from '${rule.mainBarrel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`,
      )

      for (const file of files) {
        const rel = relativePath(file)
        // バレル定義ファイル自体は除外
        if (rel.startsWith(`${rule.barrelDir}/`)) continue
        // テスト・stories は除外
        if (rel.includes('__tests__/') || rel.startsWith('stories/')) continue
        // __mocks__ は除外
        if (rel.includes('__mocks__/')) continue

        const content = fs.readFileSync(file, 'utf-8')
        if (mainBarrelPattern.test(content)) {
          violations.push(rel)
        }
      }

      expect(
        violations.length,
        `メインバレル '${rule.mainBarrel}' からの直接 import が検出されました。\n` +
          `サブバレル（record/storeTypes/calendar/analysis 等）を使用してください。\n` +
          `違反ファイル:\n${violations.join('\n')}`,
      ).toBeLessThanOrEqual(rule.maxViolations)
    })
  }

  // ─── ctx 提供データの重複取得禁止ガード ────────────────

  it('ウィジェット/チャートが ctx 提供データの hook を独自に呼ばない', () => {
    const dirs = [
      path.join(SRC_DIR, 'presentation', 'pages', 'Dashboard', 'widgets'),
      path.join(SRC_DIR, 'presentation', 'components', 'charts'),
      path.join(SRC_DIR, 'presentation', 'hooks'),
    ]

    const allFiles = dirs.flatMap((d) => (fs.existsSync(d) ? collectTsFiles(d) : []))
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      if (CTX_HOOK_ALLOWLIST.has(relPath)) continue
      if (relPath.includes('_prototypes/')) continue
      // context slice はctx 構築の一部（useWeatherSlice 等が直接 import するのは正当）
      if (relPath.startsWith('presentation/hooks/slices/')) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const hook of CTX_PROVIDED_HOOKS) {
        const importPattern = new RegExp(`import\\s+.*\\b${hook}\\b`)
        if (importPattern.test(content)) {
          violations.push(`${relPath}: ${hook} を直接 import。ctx 経由で取得してください`)
        }
      }
    }

    expect(violations, `ctx 提供データの重複取得:\n${violations.join('\n')}`).toEqual([])
  })

  // ─── サブ分析パネルのデータソースガード ────────────────

  it('サブ分析パネルが DailyRecord Map を集計に使用しない', () => {
    const chartDir = path.join(SRC_DIR, 'presentation', 'components', 'charts')
    const panelFiles = collectTsFiles(chartDir).filter((f) => f.endsWith('Panel.tsx'))
    const violations: string[] = []

    // DailyRecord Map の手動集計パターン（daily.get(d) で日別走査、prevYearDaily の Map 操作）
    // DuckDB 結果の dailyRows 等は対象外（Map ではなく配列）
    const DAILY_RECORD_AGGREGATION_PATTERNS = [
      /daily\.get\(\s*\w+\s*\)/, // Map.get() アクセス
      /prevYearDaily.*\.size/, // prevYearDaily Map のサイズチェック
      /prevYearDaily\?\.get\(/, // prevYearDaily Map.get() アクセス
    ]

    for (const file of panelFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of DAILY_RECORD_AGGREGATION_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(
            `${relativePath(file)}: DailyRecord Map を手動集計しています。DuckDB の store_day_summary を使用してください`,
          )
          break
        }
      }
    }

    expect(violations).toEqual([])
  })
})

// ─── Widget Ownership Guard ────────────────────────────

describe('Widget Ownership Guard', () => {
  const REGISTRY_FILES = [
    'presentation/pages/Dashboard/widgets/registryKpiWidgets.tsx',
    'presentation/pages/Dashboard/widgets/registryChartWidgets.tsx',
    'presentation/pages/Dashboard/widgets/registryAnalysisWidgets.tsx',
    'presentation/pages/Dashboard/widgets/registryExecWidgets.tsx',
    'presentation/pages/Dashboard/widgets/registryDuckDBWidgets.tsx',
  ]

  /** registry ファイルから widget ID を抽出する */
  function extractWidgetIds(): string[] {
    const ids: string[] = []
    const idPattern = /id:\s*'([^']+)'/g
    for (const relPath of REGISTRY_FILES) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      let match
      while ((match = idPattern.exec(content)) !== null) {
        ids.push(match[1])
      }
    }
    return ids
  }

  it('Dashboard widget は全て ownership manifest に登録されている', async () => {
    const { WIDGET_OWNERSHIP } = await import('../widgetOwnershipRegistry')
    const registeredIds = extractWidgetIds()
    const violations: string[] = []

    for (const id of registeredIds) {
      if (!(id in WIDGET_OWNERSHIP)) {
        violations.push(
          `${id}: ownership manifest (widgetOwnershipRegistry.ts) に未登録。owner を定義してください`,
        )
      }
    }

    expect(violations, `未登録 widget:\n${violations.join('\n')}`).toEqual([])
  })

  it('ownership manifest に登録されているが registry に存在しない orphan がない', async () => {
    const { WIDGET_OWNERSHIP } = await import('../widgetOwnershipRegistry')
    const registeredIds = new Set(extractWidgetIds())
    const violations: string[] = []

    for (const id of Object.keys(WIDGET_OWNERSHIP)) {
      if (!registeredIds.has(id)) {
        violations.push(
          `${id}: ownership manifest に登録されているが、registry に widget が存在しません`,
        )
      }
    }

    expect(violations, `orphan widget:\n${violations.join('\n')}`).toEqual([])
  })

  it('shared widget には理由が記載されている', async () => {
    const { WIDGET_OWNERSHIP } = await import('../widgetOwnershipRegistry')
    const violations: string[] = []

    for (const [id, entry] of Object.entries(WIDGET_OWNERSHIP)) {
      if (entry.owner === 'shared' && (!entry.reason || entry.reason.trim().length < 5)) {
        violations.push(`${id}: shared widget には理由（5文字以上）が必要です`)
      }
    }

    expect(violations).toEqual([])
  })
})

// ─── ImportedData 移行 Guard ───────────────────────────

describe('ImportedData Migration Guard', () => {
  /**
   * ImportedData の direct import（非 type-only）の件数を凍結。
   * 新規 direct import を禁止し、既存件数を単調減少させる。
   */
  const MAX_IMPORTED_DATA_DIRECT_IMPORTS = 0

  it('ImportedData の direct import 数が上限以下（増加禁止）', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const IMPORT_PATTERN = /import\s+\{[^}]*\bImportedData\b/
    let count = 0
    const violating: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      if (relPath.includes('__tests__/') || relPath.includes('monthlyDataAdapter')) continue
      if (relPath === 'domain/models/ImportedData.ts') continue
      if (relPath === 'domain/models/storeTypes.ts') continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (const line of lines) {
        if (line.trimStart().startsWith('import type')) continue
        if (IMPORT_PATTERN.test(line)) {
          count++
          violating.push(relPath)
          break
        }
      }
    }

    expect(
      count,
      `ImportedData direct import: ${count}/${MAX_IMPORTED_DATA_DIRECT_IMPORTS}。` +
        `新規 direct import は禁止。MonthlyData / AppData を使用してください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_IMPORTED_DATA_DIRECT_IMPORTS)
  })

  it('本番コードから s.data / s.dataVersion / s.legacyData セレクタが存在しない', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const BANNED_PATTERNS = [
      /useDataStore\(\(s\)\s*=>\s*s\.data\b/,
      /useDataStore\(\(s\)\s*=>\s*s\.dataVersion\b/,
      /useDataStore\(\(s\)\s*=>\s*s\.legacyData\b/,
    ]
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      if (relPath.includes('__tests__/') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relPath}: ${pattern.source}`)
        }
      }
    }

    expect(
      violations,
      `s.data / s.dataVersion / s.legacyData セレクタが本番コードに存在:\n${violations.join('\n')}\n` +
        `currentMonthData / appData / authoritativeDataVersion を使用してください`,
    ).toEqual([])
  })

  it('setImportedData / setPrevYearAutoData の呼出が存在しない', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const BANNED = /\.(setImportedData|setPrevYearAutoData)\(/
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      if (relPath.includes('__tests__/') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      if (BANNED.test(content)) {
        violations.push(relPath)
      }
    }

    expect(
      violations,
      `削除済み API が呼び出されています:\n${violations.join('\n')}\n` +
        `setCurrentMonthData / setPrevYearMonthData を使用してください`,
    ).toEqual([])
  })

  it('_calculationData が存在しない（削除済み）', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const PATTERN = /_calculationData/
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = relativePath(file)
      if (relPath.includes('__tests__/') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      if (PATTERN.test(content)) {
        violations.push(relPath)
      }
    }

    expect(
      violations,
      `_calculationData は削除済みです。currentMonthData を使用してください:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── 許可リスト lifecycle 分類の完全性 ─────────────────────

describe('P0-2: 全許可リストエントリに lifecycle が付与されている', () => {
  const ALL_LISTS: { name: string; entries: readonly AllowlistEntry[] }[] = [
    { name: 'applicationToInfrastructure', entries: applicationToInfrastructure },
    { name: 'useMemoLimits', entries: useMemoLimits },
    { name: 'useStateLimits', entries: useStateLimits },
    { name: 'hookLineLimits', entries: hookLineLimits },
    { name: 'presentationMemoLimits', entries: presentationMemoLimits },
    { name: 'presentationStateLimits', entries: presentationStateLimits },
    { name: 'ctxHook', entries: ctxHook },
    { name: 'vmReactImport', entries: vmReactImport },
    { name: 'reactImportExcludeDirs', entries: reactImportExcludeDirs },
    { name: 'sideEffectChain', entries: sideEffectChain },
    { name: 'infraLargeFiles', entries: infraLargeFiles },
    { name: 'domainLargeFiles', entries: domainLargeFiles },
    { name: 'usecasesLargeFiles', entries: usecasesLargeFiles },
    { name: 'isPrevYearHandlers', entries: isPrevYearHandlers },
    { name: 'pairExceptionDesign', entries: pairExceptionDesign },
    { name: 'pairJustifiedSingle', entries: pairJustifiedSingle },
  ]

  it('未分類エントリが 0 件', () => {
    const unclassified: string[] = []
    for (const list of ALL_LISTS) {
      for (const entry of list.entries) {
        if (!entry.lifecycle) {
          unclassified.push(`${list.name}: ${entry.path}`)
        }
      }
    }

    expect(
      unclassified,
      `lifecycle が未設定のエントリがあります:\n${unclassified.join('\n')}`,
    ).toEqual([])
  })

  it('分類サマリを出力する', () => {
    let permanent = 0
    let retirement = 0
    let activeDebt = 0
    let total = 0
    for (const list of ALL_LISTS) {
      for (const entry of list.entries) {
        total++
        if (entry.lifecycle === 'permanent') permanent++
        else if (entry.lifecycle === 'retirement') retirement++
        else if (entry.lifecycle === 'active-debt') activeDebt++
      }
    }

    console.log(
      `[P0-2] lifecycle 分類: permanent=${permanent}, retirement=${retirement}, active-debt=${activeDebt}, total=${total}`,
    )

    expect(permanent + retirement + activeDebt).toBe(total)
  })
})
