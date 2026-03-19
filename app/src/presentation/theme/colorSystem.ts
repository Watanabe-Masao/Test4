/**
 * 配色ユーティリティ (Color System Utilities)
 *
 * theme.ts に昇格した用途別色（interactive, chart, elevation）の
 * 補助ユーティリティを提供する。
 *
 * theme 経由でアクセスできない場面（ECharts の option 等）や、
 * 動的な alpha 値が必要な場面で使用する。
 *
 * 使い方:
 *   // styled-components 内 → theme 経由（推奨）
 *   background: ${({ theme }) => theme.interactive.hoverBg};
 *   color: ${({ theme }) => theme.chart.barPositive};
 *
 *   // ECharts 等の theme 外 → colorSystem ユーティリティ
 *   import { statusAlpha } from '@/presentation/theme/colorSystem'
 *   itemStyle: { color: statusAlpha('positive', 0.3) }
 */

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
