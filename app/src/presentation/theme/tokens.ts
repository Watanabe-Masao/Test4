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
  positive: '#0ea5e9', // Sky blue — 良好・プラス指標
  positiveDark: '#0284c7',
  negative: '#f97316', // Orange — 注意・マイナス指標
  negativeDark: '#ea580c',
  caution: '#eab308', // Yellow — 警告・中間
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
  costInclusion: `linear-gradient(135deg, #f97316, #ea580c)`,
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
    // ── ロールベーススケール（新規コードはこちらを使用）──
    /** バッジカウント、タイムスタンプ、極小メタデータ */
    micro: '0.55rem',
    /** チャート軸ラベル、コントロールラベル、サブタイトル（最多使用） */
    caption: '0.6rem',
    /** テーブルセル、セカンダリテキスト、タブ */
    label: '0.68rem',
    /** 本文、入力フィールド */
    body: '0.78rem',
    /** セクションタイトル、カード見出し */
    title: '0.9rem',
    /** ページタイトル */
    heading: '1.1rem',
    /** ヒーロー数値、KPI大表示 */
    display: '1.4rem',

    // ── 後方互換エイリアス（deprecated: 新規コードでの使用禁止）──
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
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
} as const

// ─── シャドウ ──────────────────────────────────────────────
export const shadows = {
  /** カード静止状態 — ほぼ平面、微かな奥行き */
  sm: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  /** カードホバー — 浮き上がり */
  md: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  /** モーダル・ポップオーバー — 明確な浮遊 */
  lg: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
} as const

// ─── z-index 階層 ────────────────────────────────────────
// 重なり順を一元管理。直接数値を .styles.ts に書かない。
export const zIndex = {
  /** ドロップダウン、ポップオーバー */
  dropdown: 100,
  /** 固定ヘッダー、ナビゲーション */
  sticky: 200,
  /** モーダル背景 + コンテナ */
  modal: 1000,
  /** トースト通知 */
  toast: 1100,
  /** ツールチップ（最前面） */
  tooltip: 1200,
} as const

// ─── モーダル ────────────────────────────────────────────
export const modal = {
  /** モーダル幅プリセット */
  width: {
    sm: '400px',
    md: '480px',
    lg: '640px',
  },
  /** モーダル最大高さ */
  maxHeight: '80vh',
  /** オーバーレイ背景ぼかし */
  backdropBlur: '12px',
  /** モーダルコンテナ自体のフロスト効果 */
  containerBlur: '20px',
} as const

// ─── トランジション ──────────────────────────────────────
export const transitions = {
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',
  /** ホバー/フォーカス用イージング */
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** 弾む動き（モーダル表示など） */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

// ─── 操作フィードバック ──────────────────────────────────
export const interaction = {
  /** カードホバー時の浮き上がり量 */
  hoverLift: 'translateY(-1px)',
  /** プレス時の沈み込み量 */
  pressScale: 'scale(0.98)',
  /** フォーカスリング */
  focusRing: '0 0 0 2px rgba(99,102,241,0.4)',
} as const

// ─── レイアウト ──────────────────────────────────────────
export const layout = {
  navWidth: '56px',
  sidebarWidth: '260px',
  navIconSize: '40px',
  logoSize: '36px',
  sectionIconSize: '32px',
} as const

// ─── ECharts 用フォントサイズ（px 整数）───────────────────
// ECharts は CSS rem ではなく px 整数が必要なため、専用トークンを定義
export const chartFontSize = {
  /** 軸ラベル、凡例テキスト（caption 相当） */
  axis: 10,
  /** ツールチップ本文（label 相当） */
  tooltip: 11,
  /** チャートタイトル（body 相当） */
  title: 13,
  /** マークライン注釈、アノテーション */
  annotation: 10,
} as const

// ─── ECharts 用スタイルトークン ───────────────────────────
export const chartStyles = {
  opacity: {
    bar: 0.82,
    area: 0.18,
    areaSubtle: 0.08,
    ghost: 0.3,
  },
  lineWidth: {
    thin: 1.5,
    standard: 2,
    emphasis: 2.5,
  },
  barRadius: {
    /** 垂直バー: 上辺のみ丸め */
    standard: [4, 4, 0, 0] as readonly [number, number, number, number],
    rounded: [6, 6, 0, 0] as readonly [number, number, number, number],
    /** 水平バー: 右辺のみ丸め */
    horizontal: [0, 4, 4, 0] as readonly [number, number, number, number],
  },
  barWidth: {
    narrow: 6,
    standard: 12,
    wide: 18,
  },
} as const

// ─── ブレークポイント ────────────────────────────────────
export const breakpoints = {
  sm: '700px',
  md: '900px',
  lg: '1100px',
  xl: '1200px',
} as const
