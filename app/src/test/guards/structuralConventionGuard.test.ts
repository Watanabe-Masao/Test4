/**
 * 構造規約ガードテスト
 *
 * バレル移行・仮実装配置・機能スライス間依存・ctx 提供データの重複取得・
 * サブ分析パネルのデータソースを検証する。
 *
 * @guard F1 バレルで後方互換
 * @guard F4 配置はパスで決まる
 * @guard F9 Raw データは唯一の真実源
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, extractImports, rel as relativePath } from '../guardTestHelpers'
import { ctxHook, buildAllowlistSet } from '../allowlists'

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
