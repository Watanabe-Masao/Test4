/**
 * DuckDB チャート共通パーツ
 *
 * DuckDB 系チャートコンポーネントで共通する styled-components と定数。
 */
import styled from 'styled-components'

// ── レイアウト ──

export const ChartPanel = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const ChartHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ChartPanelTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ChartPanelSubtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

// ── コントロール ──

export const ControlStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

export const ControlItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ControlItemLabel = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

export const ControlBtnGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

// ── 状態表示 ──

export const ChartErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

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
