/**
 * アーキテクチャガードテスト
 *
 * レイヤー間の依存ルールをソースコードの import 文をスキャンして検証する。
 *
 * @guard A1 4層依存ルール
 * @guard A2 Domain は純粋
 * @guard A3 Presentation は描画専用
 * @guard A4 取得対象の契約は Domain で定義
 * @guard A5 DI はコンポジションルート
 * @guard B2 JS/SQL 二重実装禁止（CQRS）
 * @guard F1 バレルで後方互換
 * @guard F4 配置はパスで決まる
 * @guard F9 Raw データは唯一の真実源
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  SRC_DIR,
  collectTsFiles,
  extractImports,
  extractValueImports,
  rel as relativePath,
} from './guardTestHelpers'
import {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
  presentationDuckdbHook,
  dowCalcOverride,
  ctxHook,
  buildAllowlistSet,
} from './allowlists'

// ─── 許可リスト（allowlists.ts から構築） ────────────────

const APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(applicationToInfrastructure)
const PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(presentationToInfrastructure)
const INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST = buildAllowlistSet(infrastructureToApplication)

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

  it('presentation/ は infrastructure/ に直接依存しない（許可リスト除く、import type は許容）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は application/usecases/ を直接 import しない（禁止事項 #11、import type は許容）', () => {
    // 値 import の既存違反（凍結）。移行完了時に許可リストから削除する。新規追加は禁止。
    // import type は実行時依存を生まないため検出対象外。
    const USECASE_ALLOWLIST = buildAllowlistSet(presentationToUsecases)
    const MAX_USECASE_ALLOWLIST = 2

    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (USECASE_ALLOWLIST.has(rel)) continue

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/usecases/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      'presentation/ は usecase を直接 import してはいけません。\n' +
        'Application 層の hook を経由してデータを取得してください。\n' +
        `違反: \n${violations.join('\n')}`,
    ).toEqual([])

    expect(
      USECASE_ALLOWLIST.size,
      `usecase 許可リストが上限 ${MAX_USECASE_ALLOWLIST} を超えています。新規追加禁止。`,
    ).toBeLessThanOrEqual(MAX_USECASE_ALLOWLIST)
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

  // ─── 許可リスト増加防止 ─────────────────────────────

  it('APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST は 14 件以下', () => {
    expect(
      APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size,
      `APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST が ${APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size} 件（上限: 14）`,
    ).toBeLessThanOrEqual(14)
  })

  it('PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST は 0 件（完全解消済み）', () => {
    expect(PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.size).toBeLessThanOrEqual(0)
  })

  it('INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST は 1 件以下', () => {
    expect(INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST.size).toBeLessThanOrEqual(1)
  })

  // ─── Migration Countdown（DuckDB直接参照の段階的廃止）──

  /**
   * Migration Countdown — filterStore 抽象化完了後に廃止予定
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
  const PRESENTATION_DUCKDB_HOOK_ALLOWLIST = buildAllowlistSet(presentationDuckdbHook)

  it('presentation/ の新規ファイルは DuckDB フックを直接使用しない（filterStore 経由を使用、import type は許容）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    // DuckDB フックの値 import パターン（import type は実行時依存を生まないため除外）
    // サブパス直指定（duckdb/useCts*等）やバレル経由（useDuckDBQuery）も検出する
    const DUCKDB_HOOK_VALUE_PATTERNS = [
      // @/application/hooks/duckdb（バレル）またはサブパス直指定
      /import\s+(?!type\s).*from\s+['"]@\/application\/hooks\/duckdb(?:\/[^'"]*)?['"]/,
      // useDuckDB* を含む名前付き import（任意のパスから）
      /import\s+(?!type\s)\{[^}]*useDuckDB[^}]*\}\s+from\s+['"]@\/application\/hooks[^'"]*['"]/,
      // useDuckDBQuery バレル経由の全 import（type 以外）
      /import\s+(?!type\s).*from\s+['"]@\/application\/hooks\/useDuckDBQuery['"]/,
    ]

    for (const file of files) {
      const rel = path.relative(path.join(SRC_DIR, 'presentation'), file)
      if (PRESENTATION_DUCKDB_HOOK_ALLOWLIST.has(rel)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of DUCKDB_HOOK_VALUE_PATTERNS) {
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
    const MAX_ALLOWLIST_SIZE = 31
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

  // ─── 仮実装ファイル検出ガード ──────────────────────────
  // 仮実装（Demo/Prototype）ファイルが _prototypes/ 外の本番パスに残っていないことを検証。
  // 仮実装は _prototypes/ サブディレクトリに配置し、本番昇格時に正式名へリネームすること。

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

  // ─── 前年日付の独自計算禁止ガード ─────────────────────
  // 禁止事項 #2: 引数を無視して別ソースから再計算する
  // presentation 層で dowOffset を使った前年日付の独自計算を禁止。
  // 前年同曜日の日付解決は domain/models/ComparisonScope.ts の
  // resolveSameDowSource アルゴリズムに従うこと。

  /** dowOffset による日付計算パターン（独自の同曜日補正） */
  const DOW_OFFSET_CALC_PATTERN = /\.setDate\([^)]*-\s*dowOffset/

  /**
   * 許可リスト: resolveSameDowSource と同一アルゴリズムを使用しているファイル。
   * これらのファイルは anchor ±7日の最近傍探索を実装しており、
   * dowOffset による独自補正は含まない。
   */
  const DOW_CALC_ALLOWLIST = buildAllowlistSet(dowCalcOverride)

  it('presentation 層で dowOffset による前年日付の独自計算を禁止', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violating: string[] = []

    for (const file of files) {
      const relPath = path.relative(path.join(SRC_DIR, 'presentation'), file)
      if (DOW_CALC_ALLOWLIST.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (DOW_OFFSET_CALC_PATTERN.test(content)) {
        violating.push(relPath)
      }
    }

    expect(
      violating.length,
      `dowOffset による独自日付計算が検出されました。\n` +
        `前年同曜日の日付は domain/ComparisonScope の resolveSameDowSource アルゴリズムに従ってください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBe(0)
  })

  // ─── サブバレル移行ガード ─────────────────────────────
  // メインバレルからの直接 import を禁止し、サブバレル経由を強制する。
  // バレル定義ファイル自体（index.ts 等）は除外。

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

  // ─── サブ分析パネルのデータソースガード ────────────────
  // サブパネル（*Panel.tsx in components/charts/）はデータ集約に DuckDB を使用し、
  // DailyRecord Map を直接走査して集計してはならない。
  // データ整合性は DuckDB（store_day_summary + CTS）側で保証する。

  // ─── ctx 提供データの重複取得禁止ガード ────────────────
  // useUnifiedWidgetContext で一元取得されるデータは、ウィジェットや
  // チャートコンポーネントが独自に hook を呼んで取得してはならない。
  // 同じデータに対して複数の取得パスが存在すると、引数解決の不整合で
  // 一方だけデータが空になるバグが発生する。
  //
  // 許可:
  //   - useUnifiedWidgetContext.ts 自身
  //   - _prototypes/ 内の仮実装
  //   - EtrnTestWidget.tsx（開発用デバッグウィジェット）

  /** ctx で提供されるデータの取得 hook 一覧 */
  const CTX_PROVIDED_HOOKS = [
    'useWeatherData', // → ctx.weatherDaily
  ]

  const CTX_HOOK_ALLOWLIST = buildAllowlistSet(ctxHook)

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
