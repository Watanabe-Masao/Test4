/**
 * デザイントークン定義
 * 既存HTMLのCSS変数に準拠
 */

// ─── カラーパレット ───────────────────────────────────────
export const palette = {
  // Primary
  primary: '#6366f1',
  primaryDark: '#4f46e5',

  // Semantic
  success: '#34d399',
  successDark: '#22c55e',
  successDeep: '#16a34a',
  warning: '#fbbf24',
  warningDark: '#f59e0b',
  warningDeep: '#d97706',
  danger: '#f87171',
  dangerDark: '#ef4444',
  dangerDeep: '#dc2626',
  info: '#38bdf8',
  infoDark: '#0ea5e9',

  // Extended
  purple: '#a78bfa',
  purpleDark: '#8b5cf6',
  purpleDeep: '#7c3aed',
  cyan: '#22d3ee',
  cyanDark: '#06b6d4',
  cyanDeep: '#0891b2',
  pink: '#f472b6',
  pinkDark: '#ec4899',
  lime: '#a3e635',
  limeDark: '#84cc16',
  orange: '#f97316',
  orangeDark: '#ea580c',
  blue: '#60a5fa',
  blueDark: '#3b82f6',
  slate: '#94a3b8',
  slateDark: '#64748b',

  // Neutral
  white: '#ffffff',
  black: '#000000',

  // ─── Color Universal Design (色覚多様性対応) ───────────
  // Wong (2011) palette ベース: 色覚特性に関わらず判別可能なペア
  positive: '#0ea5e9',       // Sky blue — 良好・プラス指標
  positiveDark: '#0284c7',
  negative: '#f97316',       // Orange — 注意・マイナス指標
  negativeDark: '#ea580c',
  caution: '#eab308',        // Yellow — 警告・中間
  cautionDark: '#ca8a04',
} as const

// ─── カテゴリグラデーション ───────────────────────────────
export const categoryGradients = {
  ti: `linear-gradient(135deg, #4ade80, #22c55e)`,
  to: `linear-gradient(135deg, #fb7185, #f43f5e)`,
  bi: `linear-gradient(135deg, #60a5fa, #3b82f6)`,
  bo: `linear-gradient(135deg, #c084fc, #a855f7)`,
  daily: `linear-gradient(135deg, #fbbf24, #f59e0b)`,
  market: `linear-gradient(135deg, #fbbf24, #f59e0b)`,
  lfc: `linear-gradient(135deg, #60a5fa, #3b82f6)`,
  salad: `linear-gradient(135deg, #4ade80, #22c55e)`,
  kakou: `linear-gradient(135deg, #c084fc, #a855f7)`,
  chokuden: `linear-gradient(135deg, #22d3ee, #06b6d4)`,
  hana: `linear-gradient(135deg, #f472b6, #ec4899)`,
  sanchoku: `linear-gradient(135deg, #a3e635, #84cc16)`,
  consumable: `linear-gradient(135deg, #f97316, #ea580c)`,
  tenkan: `linear-gradient(135deg, #fb7185, #f43f5e)`,
  bumonkan: `linear-gradient(135deg, #a78bfa, #8b5cf6)`,
  other: `linear-gradient(135deg, #94a3b8, #64748b)`,
} as const

// ─── タイポグラフィ ──────────────────────────────────────
export const typography = {
  fontFamily: {
    primary: "'Noto Sans JP', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  fontSize: {
    xs: '0.55rem',
    sm: '0.68rem',
    base: '0.78rem',
    lg: '0.9rem',
    xl: '0.95rem',
    '2xl': '1.1rem',
    '3xl': '1.4rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const

// ─── スペーシング ────────────────────────────────────────
export const spacing = {
  '0': '0px',
  '1': '3px',
  '2': '4px',
  '3': '6px',
  '4': '8px',
  '5': '10px',
  '6': '12px',
  '7': '14px',
  '8': '16px',
  '9': '18px',
  '10': '20px',
  '12': '24px',
} as const

// ─── ボーダー ────────────────────────────────────────────
export const radii = {
  sm: '4px',
  md: '7px',
  lg: '8px',
  xl: '10px',
  pill: '999px',
} as const

// ─── トランジション ──────────────────────────────────────
export const transitions = {
  fast: '0.2s',
  normal: '0.3s',
  slow: '0.35s',
} as const

// ─── レイアウト ──────────────────────────────────────────
export const layout = {
  navWidth: '56px',
  sidebarWidth: '260px',
  navIconSize: '40px',
  logoSize: '36px',
  sectionIconSize: '32px',
} as const

// ─── ブレークポイント ────────────────────────────────────
export const breakpoints = {
  sm: '700px',
  md: '900px',
  lg: '1100px',
  xl: '1200px',
} as const
