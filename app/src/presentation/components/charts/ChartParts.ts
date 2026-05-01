/**
 * チャート共通パーツ
 *
 * チャートコンポーネントで共通する styled-components と定数。
 * @responsibility R:unclassified
 */
import { palette } from '@/presentation/theme/tokens'

// ── Styled Components（styles ファイルから re-export） ──

export {
  ControlStrip,
  ControlItem,
  ControlItemLabel,
  ControlBtnGroup,
  ToggleBtn,
  ChartErrorMsg,
} from './ChartParts.styles'

// ── 定数 ──

export type HierarchyLevel = 'department' | 'line' | 'klass'

export const HIERARCHY_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

export const CATEGORY_COLORS = [
  palette.primary,
  palette.successDark,
  palette.warningDark,
  palette.dangerDark,
  palette.blueDark,
  palette.purpleDark,
  palette.pinkDark,
  '#14b8a6',
  palette.orange,
  palette.cyanDark,
] as const

// ── ユーティリティ ──

/** YYYYMMDD → MM/DD */
export function formatDateKey(v: string): string {
  if (v.length === 8) return `${v.slice(4, 6)}/${v.slice(6)}`
  return v
}
