/**
 * 配色ユーティリティ (Color System Utilities)
 *
 * theme.ts に昇格した用途別色（interactive, chart, elevation）の
 * 補助ユーティリティを提供する。
 *
 * theme 経由でアクセスできない場面（Recharts の fill/stroke に直接渡す等）や、
 * 動的な alpha 値が必要な場面で使用する。
 *
 * 使い方:
 *   // styled-components 内 → theme 経由（推奨）
 *   background: ${({ theme }) => theme.interactive.hoverBg};
 *   color: ${({ theme }) => theme.chart.barPositive};
 *
 *   // Recharts 等の theme 外 → colorSystem ユーティリティ
 *   import { statusAlpha } from '@/presentation/theme/colorSystem'
 *   fill={statusAlpha('positive', 0.3)}
 */
import { palette } from './tokens'

// ─── Status Colors (状態表示) ───────────────────────────

/** 状態色 — 良好/注意/警告/中性（semanticColors.ts と補完関係） */
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

// ─── 動的 Alpha ユーティリティ ──────────────────────────

/** 状態色の RGB ベース値 */
const STATUS_RGB_BASES = {
  positive: '34,197,94',
  negative: '239,68,68',
  info: '59,130,246',
  muted: '156,163,175',
} as const

type StatusKind = keyof typeof STATUS_RGB_BASES

/** 状態色の rgba（任意の alpha）— チャートのハイライト背景等に使用 */
export function statusAlpha(kind: StatusKind, alpha: number): string {
  return `rgba(${STATUS_RGB_BASES[kind]},${alpha})`
}

/** 状態色の solid hex — チャートの線・マーカー等に使用 */
export function statusSolid(kind: StatusKind): string {
  const map: Record<StatusKind, string> = {
    positive: palette.successDark,
    negative: palette.dangerDark,
    info: palette.blueDark,
    muted: palette.slateDark,
  }
  return map[kind]
}
