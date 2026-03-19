/**
 * 配色管理システム (Color System)
 *
 * 設計原則:
 *   #1 「機械で守る」— CIガードで直接色指定を禁止
 *   #8 「文字列はカタログ」— 全色をこのファイルで一元管理
 *   #4 「変更頻度で分離」— 色だけ変えたい時にこのファイルだけ変更
 *
 * 使い方:
 *   import { surface, interactive, chart, status } from '@/presentation/theme/colorSystem'
 *
 *   background: ${surface.cardBg};              // カード背景
 *   background: ${interactive.hoverBg};         // ホバー背景
 *   fill: ${chart.series[0]};                   // チャート1本目の色
 *   color: ${status.positive};                  // ポジティブ指標
 *
 * ルール:
 *   - .styles.ts で直接 rgba() や #hex を書いてはならない
 *   - 色は必ず本ファイルの定数 or theme.colors.* 経由で参照する
 *   - 新しい色が必要な場合は本ファイルに追加する
 */
import { palette } from './tokens'

// ─── Surface Colors (背景・境界) ────────────────────────

/** 表面色 — カード・パネル・コンテナの背景に使用 */
export const surface = {
  /** カード/パネル背景（theme.colors.bg3 と同義、styled-components 外で使用する場合） */
  cardBg: 'var(--surface-card)',
  /** 凹みコンテナ（SegmentedControl Track 等） */
  insetBg: 'var(--surface-inset)',
} as const

// ─── Interactive Colors (操作系) ────────────────────────

/** ダーク/ライト両対応のインタラクション色 */
export const interactive = {
  /** ホバー時の背景（ダーク: 白 8% / ライト: 黒 6%） */
  hoverBg: { dark: 'rgba(255,255,255,0.08)', light: 'rgba(0,0,0,0.06)' },
  /** アクティブトグルの背景（primary 色ベース） */
  activeBg: { dark: 'rgba(99,102,241,0.2)', light: 'rgba(99,102,241,0.08)' },
  /** 微かな背景（パネル、ガイド等） */
  subtleBg: { dark: 'rgba(255,255,255,0.04)', light: 'rgba(0,0,0,0.02)' },
  /** 微かな背景（やや強め） */
  mutedBg: { dark: 'rgba(255,255,255,0.06)', light: 'rgba(0,0,0,0.04)' },
  /** Track inset shadow の不透明度 */
  insetShadowOpacity: { dark: '0.3', light: '0.06' },
} as const

/** テーマモードに応じた色を返すヘルパー */
export function resolveMode(
  pair: { dark: string; light: string },
  mode: 'dark' | 'light',
): string {
  return pair[mode]
}

// ─── Status Colors (状態表示) ───────────────────────────

/** 状態色 — 良好/注意/警告/中性 */
export const status = {
  positive: palette.positive,
  positiveDark: palette.positiveDark,
  negative: palette.negative,
  negativeDark: palette.negativeDark,
  caution: palette.caution,
  cautionDark: palette.cautionDark,
  neutral: palette.slate,
  neutralDark: palette.slateDark,
} as const

/** 状態色の rgba バリアント（背景ハイライト用） */
export const statusBg = {
  positive: { dark: 'rgba(34,197,94,0.12)', light: 'rgba(34,197,94,0.06)' },
  negative: { dark: 'rgba(239,68,68,0.12)', light: 'rgba(239,68,68,0.06)' },
  info: { dark: 'rgba(59,130,246,0.12)', light: 'rgba(59,130,246,0.06)' },
  muted: { dark: 'rgba(156,163,175,0.12)', light: 'rgba(156,163,175,0.06)' },
} as const

/** 状態色の rgba（任意の alpha） */
export function statusAlpha(
  kind: 'positive' | 'negative' | 'info' | 'muted',
  alpha: number,
): string {
  const bases: Record<string, string> = {
    positive: '34,197,94',
    negative: '239,68,68',
    info: '59,130,246',
    muted: '156,163,175',
  }
  return `rgba(${bases[kind]},${alpha})`
}

/** 状態色の solid hex */
export function statusSolid(kind: 'positive' | 'negative' | 'info' | 'muted'): string {
  const map: Record<string, string> = {
    positive: palette.successDark,
    negative: palette.dangerDark,
    info: palette.blueDark,
    muted: '#9ca3af',
  }
  return map[kind]
}

// ─── Chart Colors (チャート系列) ────────────────────────

/** チャート系列色 — 折れ線・棒グラフ・円グラフに使用 */
export const chart = {
  /** メイン系列色パレット（最大10色、色覚多様性考慮） */
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
  ] as readonly string[],

  /** 店舗間比較用パレット（最大6色） */
  stores: [
    palette.primary,
    palette.successDark,
    palette.warningDark,
    palette.dangerDark,
    palette.cyanDark,
    palette.pinkDark,
  ] as readonly string[],

  /** 前年比較用の固定色 */
  currentYear: palette.primary,
  previousYear: palette.slate,
  budget: palette.infoDark,
  target: palette.warningDark,

  /** ポジティブ/ネガティブ（棒グラフの正負色分け） */
  barPositive: palette.successDark,
  barNegative: palette.dangerDark,
} as const

// ─── Elevation (影・奥行き) ─────────────────────────────

/** 影定数 — ドロップダウン・モーダル等 */
export const elevation = {
  popup: '0 4px 12px rgba(0,0,0,0.15)',
  tooltip: '0 4px 16px rgba(0,0,0,0.15)',
  /** テキストシャドウ（オーバーレイ文字用） */
  textOverlay: '0 1px 2px rgba(0,0,0,0.3)',
} as const
