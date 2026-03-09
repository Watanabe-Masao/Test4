import styled from 'styled-components'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const Th = styled.th<{ $align?: 'left' | 'right'; $sortable?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: ${({ $align }) => $align ?? 'right'};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    ${({ $sortable, theme }) => ($sortable ? `background: ${theme.colors.bg3};` : '')}
  }
`

export const Td = styled.td<{ $align?: 'left' | 'right' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: ${({ $align }) => $align ?? 'right'};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const DiffCell = styled(Td)<{ $positive?: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive == null
      ? theme.colors.text4
      : $positive
        ? theme.colors.palette.positive
        : theme.colors.palette.negative};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 6px;
  flex-shrink: 0;
`

export const MarkupCell = styled.td<{ $rate: number }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $rate, theme }) =>
    $rate >= 0.25
      ? theme.colors.palette.successDark
      : $rate >= 0.15
        ? theme.colors.palette.warningDark
        : theme.colors.palette.dangerDark};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

export const MarkupIndicator = styled.span<{ $isDown: boolean }>`
  font-size: 0.7rem;
  margin-left: 4px;
  color: ${({ $isDown, theme }) =>
    $isDown ? theme.colors.palette.dangerDark : theme.colors.palette.successDark};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`

export const ChartWrapper = styled.div`
  height: 300px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

/* ─── Pivot Table (category × date matrix) ────────────── */

export const PivotTableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};

  & > table {
    th:first-child,
    td:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      background: inherit;
    }
  }
`

export const PivotGroupTh = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: center;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`

export const PurchasePivotGroupTh = styled(PivotGroupTh)<{ $color?: string }>`
  border-top: 3px solid ${({ $color }) => $color ?? 'transparent'};
`

export const PivotSubTh = styled.th`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &.group-start {
    border-left: 2px solid ${({ theme }) => theme.colors.border};
  }
`

export const PivotTd = styled(Td)<{ $groupStart?: boolean; $negative?: boolean }>`
  ${({ $groupStart, theme }) => $groupStart && `border-left: 2px solid ${theme.colors.border};`}
  color: ${({ $negative, theme }) => ($negative ? theme.colors.palette.danger : theme.colors.text)};
`

export const SubNote = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text4};
`

/* ─── Drill-down (expandable rows) ────────────── */

export const DrillTr = styled.tr<{ $expanded?: boolean }>`
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg2};
  }
  ${({ $expanded, theme }) => $expanded && `background: ${theme.colors.bg2};`}
`

export const DrillToggle = styled.span`
  display: inline-block;
  width: 16px;
  text-align: center;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: 4px;
  transition: transform 0.15s;
`

export const ChildTr = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  & > td {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text3};
    padding-top: 4px;
    padding-bottom: 4px;
  }
`

/* ─── Progress bar ────────────── */

export const ProgressSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const ProgressCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.bg};
`

export const ProgressLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const ProgressValue = styled.div<{ $accent?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $accent, theme }) => $accent ?? theme.colors.text};
`

export const ProgressSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ProgressBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: 3px;
  margin-top: ${({ theme }) => theme.spacing[2]};
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => Math.min($width, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.3s ease;
`
