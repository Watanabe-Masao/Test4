/**
 * Dashboard スタイル — バレルファイル
 *
 * 各グループの styled-components は個別ファイルに分割済み。
 * 後方互換のため、全エクスポートをここから re-export する。
 * 新規コードは個別ファイルから直接 import することを推奨。
 */
import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTableTitle,
  DataTable,
  DataTh,
  DataTd,
} from '@/presentation/components/common'

// ─── Re-exports from split files ────────────────────────

export * from './ExecSummary.styles'
export * from './RangeComparison.styles'
export * from './MonthlyCalendar.styles'
export * from './DayDetail.styles'
export * from './ForecastTools.styles'

// ─── Scroll Wrapper ─────────────────────────────────────

export const ScrollWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

// ─── Summary Table Styled Components ────────────────────
// DataTable ベースに Dashboard 固有のスタイルを上書き

export const STableWrapper = styled(DataTableWrapper)`
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const STableTitle = DataTableTitle

export const STable = styled(DataTable)`
  font-family: inherit;
`

export const STh = styled(DataTh)`
  padding: ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  &:first-child {
    text-align: left;
  }
`

export const STd = styled(DataTd)`
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text2};
  &:first-child {
    text-align: left;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── Layout Styled Components ───────────────────────────

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

export const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

export const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver, theme }) =>
    $isOver
      ? `
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed ${theme.colors.palette.primary};
      border-radius: ${theme.radii.lg};
      pointer-events: none;
      z-index: 1;
    }
  `
      : ''}
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`

export const DragHandle = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
`

export const DeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  top: 4px;
  right: 26px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.danger};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
  &:hover {
    opacity: 1 !important;
    filter: brightness(1.1);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const WidgetLinkBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  opacity: 0;
  transition:
    opacity 0.2s,
    color 0.15s;
  z-index: 2;
  &:hover {
    color: ${({ theme }) => theme.colors.palette.primary};
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const WidgetWrapper = styled.div`
  position: relative;
  &:hover ${WidgetLinkBtn} {
    opacity: 0.7;
  }
`

// ─── Settings Panel ──────────────────────────────────────

export const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
`

export const Panel = styled.div`
  width: 340px;
  max-width: 90vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
`

export const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const WidgetItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

export type WidgetSize = 'kpi' | 'half' | 'full'

export const SizeBadge = styled.span<{ $size: WidgetSize }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $size, theme }) =>
    $size === 'kpi'
      ? `${theme.colors.palette.primary}20`
      : $size === 'half'
        ? `${theme.colors.palette.success}20`
        : `${theme.colors.palette.warning}20`};
  color: ${({ $size, theme }) =>
    $size === 'kpi'
      ? theme.colors.palette.primary
      : $size === 'half'
        ? theme.colors.palette.success
        : theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const PanelFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`
