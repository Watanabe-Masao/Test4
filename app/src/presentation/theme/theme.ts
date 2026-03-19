import {
  palette,
  categoryGradients,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
  layout,
  breakpoints,
  chartFontSize,
  chartStyles,
} from './tokens'

// ─── テーマカラー型 ──────────────────────────────────────
export interface ThemeColors {
  bg: string
  bg2: string
  bg3: string
  bg4: string
  text: string
  text2: string
  text3: string
  text4: string
  border: string
  palette: typeof palette
}

// ─── インタラクション色型 ────────────────────────────────

/** ホバー・アクティブ・背景ティントのモード解決済み色 */
export interface InteractiveColors {
  /** ホバー時の背景（ボタン、行、コントロール） */
  readonly hoverBg: string
  /** アクティブ/選択状態の背景（トグル、タブ） */
  readonly activeBg: string
  /** 微かな背景（パネル、ガイド、非アクティブ領域） */
  readonly subtleBg: string
  /** やや強めの背景（入力フィールド、フィルタ） */
  readonly mutedBg: string
  /** モーダル背景オーバーレイ */
  readonly backdrop: string
}

// ─── チャート色型 ────────────────────────────────────────

/** チャート描画に使用する色定義 */
export interface ChartColors {
  /** 系列色パレット（最大10色、色覚多様性考慮） */
  readonly series: readonly string[]
  /** 店舗間比較用パレット（最大6色） */
  readonly stores: readonly string[]
  /** 前年比較: 当年の色 */
  readonly currentYear: string
  /** 前年比較: 比較期の色 */
  readonly previousYear: string
  /** 予算線の色 */
  readonly budget: string
  /** 棒グラフ正値 */
  readonly barPositive: string
  /** 棒グラフ負値 */
  readonly barNegative: string
}

// ─── エレベーション型 ────────────────────────────────────

/** 影・奥行きの定義 */
export interface ElevationTokens {
  /** ポップアップ/ドロップダウン */
  readonly popup: string
  /** ツールチップ */
  readonly tooltip: string
  /** テキストオーバーレイ（画像上文字等） */
  readonly overlay: string
}

// ─── ダークテーマ色定義 ──────────────────────────────────
const darkColors: Omit<ThemeColors, 'palette'> = {
  bg: '#09090b',
  bg2: '#0f1117',
  bg3: '#16181f',
  bg4: '#1c1f28',
  text: '#f4f4f5',
  text2: '#a1a1aa',
  text3: '#71717a',
  text4: '#52525b',
  border: 'rgba(255,255,255,0.06)',
}

// ─── ライトテーマ色定義 ──────────────────────────────────
const lightColors: Omit<ThemeColors, 'palette'> = {
  bg: '#f8fafc',
  bg2: '#ffffff',
  bg3: '#f1f5f9',
  bg4: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#64748b',
  text4: '#94a3b8',
  border: 'rgba(0,0,0,0.08)',
}

// ─── モード別インタラクション色 ──────────────────────────

const darkInteractive: InteractiveColors = {
  hoverBg: 'rgba(255,255,255,0.08)',
  activeBg: 'rgba(99,102,241,0.2)',
  subtleBg: 'rgba(255,255,255,0.04)',
  mutedBg: 'rgba(255,255,255,0.06)',
  backdrop: 'rgba(0,0,0,0.5)',
}

const lightInteractive: InteractiveColors = {
  hoverBg: 'rgba(0,0,0,0.06)',
  activeBg: 'rgba(99,102,241,0.08)',
  subtleBg: 'rgba(0,0,0,0.02)',
  mutedBg: 'rgba(0,0,0,0.04)',
  backdrop: 'rgba(0,0,0,0.5)',
}

// ─── チャート色（モード非依存） ──────────────────────────

const chartColors: ChartColors = {
  series: [
    palette.primary,
    palette.successDark,
    palette.warningDark,
    palette.dangerDark,
    palette.cyanDark,
    palette.pinkDark,
    palette.purpleDark,
    palette.orangeDark,
    palette.blueDark,
    palette.limeDark,
  ],
  stores: [
    palette.primary,
    palette.successDark,
    palette.warningDark,
    palette.dangerDark,
    palette.cyanDark,
    palette.pinkDark,
  ],
  currentYear: palette.primary,
  previousYear: palette.slate,
  budget: palette.infoDark,
  barPositive: palette.successDark,
  barNegative: palette.dangerDark,
}

// ─── エレベーション（モード非依存） ──────────────────────

const elevationTokens: ElevationTokens = {
  popup: '0 4px 12px rgba(0,0,0,0.15)',
  tooltip: '0 4px 16px rgba(0,0,0,0.15)',
  overlay: '0 1px 2px rgba(0,0,0,0.3)',
}

// ─── テーマ型定義 ────────────────────────────────────────
export type ThemeMode = 'dark' | 'light'

export interface AppTheme {
  mode: ThemeMode
  colors: ThemeColors
  interactive: InteractiveColors
  chart: ChartColors
  elevation: ElevationTokens
  categoryGradients: typeof categoryGradients
  typography: typeof typography
  spacing: typeof spacing
  radii: typeof radii
  shadows: typeof shadows
  transitions: typeof transitions
  layout: typeof layout
  breakpoints: typeof breakpoints
  chartFontSize: typeof chartFontSize
  chartStyles: typeof chartStyles
}

// ─── テーマ生成 ──────────────────────────────────────────
function createTheme(mode: ThemeMode): AppTheme {
  const modeColors = mode === 'dark' ? darkColors : lightColors
  const modeInteractive = mode === 'dark' ? darkInteractive : lightInteractive
  return {
    mode,
    colors: {
      ...modeColors,
      palette,
    },
    interactive: modeInteractive,
    chart: chartColors,
    elevation: elevationTokens,
    categoryGradients,
    typography,
    spacing,
    radii,
    shadows,
    transitions,
    layout,
    breakpoints,
    chartFontSize,
    chartStyles,
  }
}

export const darkTheme = createTheme('dark')
export const lightTheme = createTheme('light')
