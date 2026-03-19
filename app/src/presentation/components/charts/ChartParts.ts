/**
 * チャート共通パーツ
 *
 * チャートコンポーネントで共通する styled-components と定数。
 */

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
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
] as const

// ── ユーティリティ ──

/** YYYYMMDD → MM/DD */
export function formatDateKey(v: string): string {
  if (v.length === 8) return `${v.slice(4, 6)}/${v.slice(6)}`
  return v
}
