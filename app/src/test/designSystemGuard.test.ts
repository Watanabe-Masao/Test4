/**
 * デザインシステムガードテスト
 *
 * 配色・フォント・サイズの直接指定を禁止し、
 * テーマトークンと colorSystem 定数の使用を強制する。
 *
 * @guard F2 文字列はカタログ（色・サイズも定数カタログ化）
 * @guard G1 ルールはテストに書く
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, rel } from './guardTestHelpers'

const PRESENTATION_DIR = path.join(SRC_DIR, 'presentation')

// ─── ローカルヘルパー ──────────────────────────────────

/** 拡張子ベースでファイルを収集する（designSystemGuard 固有） */
function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      results.push(...collectFiles(fullPath, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath)
    }
  }
  return results
}

function stripComments(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')
}

// ─── 検出パターン ──────────────────────────────────────

const HEX_COLOR_PATTERN = /(?<!palette\.)(?<!')#[0-9a-fA-F]{3,8}\b/g
const RGBA_PATTERN = /rgba\s*\(\s*\d/g
const HARDCODED_FONT_SIZE = /font-size:\s*[\d.]+(?:rem|px)\s*;/g

/** テーマ経由の正当な参照パターン */
const THEME_REF_PATTERNS = [
  // theme オブジェクト経由
  'theme.colors.',
  'theme.typography.',
  'theme.spacing[',
  'theme.radii.',
  'theme.shadows.',
  'theme.transitions.',
  'theme.mode',
  'theme.interactive.',
  'theme.chart.',
  'theme.elevation.',
  // トークン直接参照
  'palette.',
  'sc.',
  'ct.',
  // colorSystem ユーティリティ
  'statusAlpha(',
  // チャート共通
  'STORE_COLORS',
  'CATEGORY_COLORS',
  'STATUS_RGB',
  'TRACK_SHADOW',
  'TOOLBAR_LABEL',
]

function isThemeContextLine(line: string): boolean {
  return THEME_REF_PATTERNS.some((p) => line.includes(p))
}

/** ファイル内にパターン違反があるかチェックし、違反行リストを返す */
function scanFile(filePath: string, pattern: RegExp): { relPath: string; violations: string[] } {
  const relPath = rel(filePath)
  const content = fs.readFileSync(filePath, 'utf-8')
  const stripped = stripComments(content)
  const lines = stripped.split('\n')
  const violations: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isThemeContextLine(line)) continue
    if (line.trimStart().startsWith('import ')) continue

    const matches = line.match(pattern)
    if (matches) {
      violations.push(`${relPath}:${i + 1}`)
    }
  }

  return { relPath, violations }
}

// ─── 違反ファイル数の凍結上限 ──────────────────────────
// 現在の違反ファイル数を凍結。新規ファイルの追加で増えたら FAIL。
// 既存ファイルを修正したら上限を下げること。

/** hex 色違反を持つファイル数の上限 */
const MAX_HEX_VIOLATING_FILES = 1

/** rgba() 違反を持つファイル数の上限 */
const MAX_RGBA_VIOLATING_FILES = 35

/** font-size 違反を持つファイル数の上限 */
const MAX_FONT_VIOLATING_FILES = 51

// ─── テスト ────────────────────────────────────────────

describe('デザインシステムガード', () => {
  const styleFiles = collectFiles(PRESENTATION_DIR, '.styles.ts')
  // colorSystem.ts と tokens.ts は定義元なので除外
  const targetFiles = styleFiles.filter(
    (f) => !f.includes('colorSystem') && !f.includes('tokens.ts'),
  )

  it('hex 色違反ファイル数が上限以下（新規ファイルでの増加禁止）', () => {
    let violatingFileCount = 0
    const violatingFiles: string[] = []

    for (const file of targetFiles) {
      const { relPath, violations } = scanFile(file, HEX_COLOR_PATTERN)
      if (violations.length > 0) {
        violatingFileCount++
        violatingFiles.push(`${relPath} (${violations.length}箇所)`)
      }
    }

    expect(
      violatingFileCount,
      `hex 色違反ファイル数: ${violatingFileCount}/${MAX_HEX_VIOLATING_FILES}。` +
        `上限を超えています。新規ファイルでは theme.colors.* / palette.* / colorSystem を使用してください。\n` +
        `違反ファイル:\n${violatingFiles.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_HEX_VIOLATING_FILES)
  })

  it('rgba() 違反ファイル数が上限以下（新規ファイルでの増加禁止）', () => {
    let violatingFileCount = 0
    const violatingFiles: string[] = []

    for (const file of targetFiles) {
      const { relPath, violations } = scanFile(file, RGBA_PATTERN)
      if (violations.length > 0) {
        violatingFileCount++
        violatingFiles.push(`${relPath} (${violations.length}箇所)`)
      }
    }

    expect(
      violatingFileCount,
      `rgba() 違反ファイル数: ${violatingFileCount}/${MAX_RGBA_VIOLATING_FILES}。` +
        `上限を超えています。新規ファイルでは colorSystem の interactive.* / statusBg.* / statusAlpha() を使用してください。\n` +
        `違反ファイル:\n${violatingFiles.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_RGBA_VIOLATING_FILES)
  })

  it('font-size 違反ファイル数が上限以下（新規ファイルでの増加禁止）', () => {
    let violatingFileCount = 0
    const violatingFiles: string[] = []

    for (const file of targetFiles) {
      const { relPath, violations } = scanFile(file, HARDCODED_FONT_SIZE)
      if (violations.length > 0) {
        violatingFileCount++
        violatingFiles.push(`${relPath} (${violations.length}箇所)`)
      }
    }

    expect(
      violatingFileCount,
      `font-size 違反ファイル数: ${violatingFileCount}/${MAX_FONT_VIOLATING_FILES}。` +
        `上限を超えています。新規ファイルでは theme.typography.fontSize.* を使用してください。\n` +
        `違反ファイル:\n${violatingFiles.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_FONT_VIOLATING_FILES)
  })

  // ─── ECharts ハードコード fontSize ガード ─────────────
  // ECharts option 内の fontSize: <数値> を検出。chartFontSize.* トークンを使用すべき。

  /** チャートファイルで fontSize ハードコードを持つファイル数の上限 */
  const MAX_ECHARTS_FONT_FILES = 7

  it('ECharts チャートの fontSize ハードコードが上限以下', () => {
    const chartDir = path.join(PRESENTATION_DIR, 'components', 'charts')
    const chartFiles = [...collectFiles(chartDir, '.tsx'), ...collectFiles(chartDir, '.ts')].filter(
      (f) =>
        !f.includes('.test.') &&
        !f.includes('.stories.') &&
        !f.includes('.styles.') &&
        !f.includes('chartTheme') &&
        !f.includes('echartsOptionBuilders') &&
        !f.includes('builders/'),
    )

    const ECHARTS_FONT_PATTERN = /fontSize:\s*\d+/g
    const TOKEN_REF = /chartFontSize\.|ct\.fontSize\./
    let violatingCount = 0
    const violating: string[] = []

    for (const file of chartFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      let fileHasViolation = false
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.trimStart().startsWith('//')) continue
        if (ECHARTS_FONT_PATTERN.test(line) && !TOKEN_REF.test(line)) {
          fileHasViolation = true
          break
        }
      }
      if (fileHasViolation) {
        violatingCount++
        violating.push(rel(file))
      }
    }

    expect(
      violatingCount,
      `ECharts fontSize ハードコード: ${violatingCount}/${MAX_ECHARTS_FONT_FILES}。` +
        `chartFontSize.* トークンを使用してください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_ECHARTS_FONT_FILES)
  })

  // ─── deprecated fontSize エイリアスガード ─────────────
  // fontSize.xs/sm/base/lg/xl/2xl/3xl の使用を検出。ロールベース名を使用すべき。

  /** deprecated fontSize エイリアスを使用するファイル数の上限 */
  const MAX_DEPRECATED_FONT_ALIAS_FILES = 120

  it('deprecated fontSize エイリアス使用が上限以下', () => {
    const allTsFiles = [
      ...collectFiles(PRESENTATION_DIR, '.ts'),
      ...collectFiles(PRESENTATION_DIR, '.tsx'),
    ].filter(
      (f) =>
        !f.includes('.test.') &&
        !f.includes('.stories.') &&
        !f.includes('tokens.ts') &&
        !f.includes('theme.ts'),
    )

    const DEPRECATED_PATTERN = /fontSize\.(xs|sm|base|lg|xl)\b|fontSize\[['"](?:2xl|3xl)['"]\]/
    let violatingCount = 0
    const violating: string[] = []

    for (const file of allTsFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (DEPRECATED_PATTERN.test(content)) {
        violatingCount++
        violating.push(rel(file))
      }
    }

    expect(
      violatingCount,
      `deprecated fontSize エイリアス使用: ${violatingCount}/${MAX_DEPRECATED_FONT_ALIAS_FILES}。` +
        `ロールベース名（micro/caption/label/body/title/heading/display）を使用してください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_DEPRECATED_FONT_ALIAS_FILES)
  })

  // ─── Recharts → ECharts 移行ガード ──────────────────

  /** Recharts import を持つチャート .tsx ファイル数の上限（移行完了: 0） */
  const MAX_RECHARTS_FILES = 0

  it('Recharts 使用チャート数が上限以下（新規チャートは ECharts 必須）', () => {
    const chartFiles = [
      ...collectFiles(path.join(PRESENTATION_DIR, 'components', 'charts'), '.tsx'),
      ...collectFiles(path.join(PRESENTATION_DIR, 'pages'), '.tsx'),
    ]
    let rechartsCount = 0
    const rechartsFiles: string[] = []

    for (const file of chartFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes("from 'recharts'")) {
        rechartsCount++
        rechartsFiles.push(rel(file))
      }
    }

    expect(
      rechartsCount,
      `Recharts 使用ファイル数: ${rechartsCount}/${MAX_RECHARTS_FILES}。` +
        `新規チャートは ECharts (EChart コンポーネント) を使用してください。\n` +
        `Recharts ファイル:\n${rechartsFiles.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_RECHARTS_FILES)
  })

  // ─── ChartCard ラッパーガード ────────────────────────
  // スタンドアロンチャートは ChartCard を使用すべき。

  /** ChartCard 未使用のスタンドアロンチャート数の上限 */
  const MAX_NO_CHARTCARD_FILES = 0

  /** ChartCard 不要のサブコンポーネント・特殊ケース */
  const CHARTCARD_EXCLUSIONS = new Set([
    // サブコンポーネント（親が ChartCard を提供）
    'presentation/components/charts/ContainedAnalysisPanel.tsx',
    'presentation/components/charts/CategoryBoxPlotView.tsx',
    'presentation/components/charts/CvHeatmapView.tsx',
    'presentation/components/charts/CvLineView.tsx',
    'presentation/components/charts/CvSalesCvView.tsx',
    // ファサード re-export / ラッパー（内部コンポーネントが ChartCard を使用）
    'presentation/components/charts/GrossProfitRateChart.tsx',
    'presentation/components/charts/IntegratedSalesChart.tsx',
    // KPI カード（チャートではない）
    'presentation/components/charts/BudgetProgressCard.tsx',
    // ダッシュボード（独自レイアウト）
    'presentation/components/charts/SensitivityDashboard.tsx',
    // サブ分析パネル（IntegratedSalesChart のサブコンポーネント、親が ChartCard を提供）
    'presentation/components/charts/SubAnalysisPanel.tsx',
    'presentation/components/charts/FactorDecompositionPanel.tsx',
    'presentation/components/charts/DiscountAnalysisPanel.tsx',
    'presentation/components/charts/WeatherAnalysisPanel.tsx',
    'presentation/components/charts/CategoryHeatmapPanel.tsx',
    // IntegratedSalesChart のサブタブコンテンツ（AnimatePresence ラッパー）
    'presentation/components/charts/IntegratedSalesSubTabs.tsx',
    // カテゴリ×時間帯ヒートマップ（TimeSlotChart のサブコンポーネント、親が ChartCard を提供）
    'presentation/components/charts/CategoryTimeHeatmap.tsx',
    // TimeSlotChart の View コンポーネント（Controller が ChartCard を提供）
    'presentation/components/charts/TimeSlotChartView.tsx',
  ])

  it('スタンドアロンチャートの ChartCard 未使用が上限以下', () => {
    const chartDir = path.join(PRESENTATION_DIR, 'components', 'charts')
    const chartFiles = collectFiles(chartDir, '.tsx').filter(
      (f) =>
        !f.includes('.styles.') &&
        !f.includes('.stories.') &&
        !f.includes('.test.') &&
        !f.includes('ChartCard') &&
        !f.includes('ChartHelp') &&
        !f.includes('ChartHeader') &&
        !f.includes('ChartState') &&
        !f.includes('ChartToolbar') &&
        !f.includes('ChartAnnotation') &&
        !f.includes('EChart.tsx') &&
        !f.includes('builders/') &&
        !f.includes('DualPeriodSlider') &&
        !f.includes('DowPresetSelector') &&
        !f.includes('useDailySalesData') &&
        !f.includes('useDualPeriod') &&
        !f.includes('chartTheme') &&
        !f.includes('chartGuides') &&
        !f.includes('CurrencyUnitToggle') &&
        !f.includes('PeriodFilter') &&
        !f.includes('DateRangePicker') &&
        !f.includes('DayRangeSlider') &&
        !f.includes('Context') &&
        !f.includes('Explorer') &&
        !f.includes('Table') &&
        !f.includes('Body') &&
        !f.includes('SubViews') &&
        !f.includes('Breakdown'),
    )

    let violatingCount = 0
    const violating: string[] = []

    for (const file of chartFiles) {
      const relPath = rel(file)
      if (CHARTCARD_EXCLUSIONS.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('ChartCard')) {
        violatingCount++
        violating.push(relPath)
      }
    }

    expect(
      violatingCount,
      `ChartCard 未使用チャート: ${violatingCount}/${MAX_NO_CHARTCARD_FILES}。` +
        `新規チャートは ChartCard ラッパーを使用してください。\n` +
        `未使用ファイル:\n${violating.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_NO_CHARTCARD_FILES)
  })

  // ─── z-index ハードコードガード ──────────────────────
  // グローバル z-index (100以上) は theme.zIndex トークンを使用すべき。

  /** z-index ハードコード (100以上) を持つ .styles.ts ファイル数の上限 */
  const MAX_ZINDEX_HARDCODE_FILES = 10

  it('グローバル z-index ハードコードが上限以下', () => {
    const allStyleFiles = collectFiles(PRESENTATION_DIR, '.styles.ts')
    const ZINDEX_PATTERN = /z-index:\s*(\d+)/g
    const TOKEN_REF = /theme\.zIndex\./
    let violatingCount = 0
    const violating: string[] = []

    for (const file of allStyleFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      let fileHasViolation = false
      for (const line of lines) {
        const match = ZINDEX_PATTERN.exec(line)
        if (match && Number(match[1]) >= 100 && !TOKEN_REF.test(line)) {
          fileHasViolation = true
          break
        }
        ZINDEX_PATTERN.lastIndex = 0
      }
      if (fileHasViolation) {
        violatingCount++
        violating.push(rel(file))
      }
    }

    expect(
      violatingCount,
      `z-index ハードコード: ${violatingCount}/${MAX_ZINDEX_HARDCODE_FILES}。` +
        `theme.zIndex.* トークンを使用してください。\n` +
        `違反ファイル:\n${violating.join('\n')}`,
    ).toBeLessThanOrEqual(MAX_ZINDEX_HARDCODE_FILES)
  })
})
