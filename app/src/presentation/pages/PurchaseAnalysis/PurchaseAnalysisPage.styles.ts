import styled from 'styled-components'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
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

export const DiffCell = styled(Td)<{ $positive?: boolean; $groupStart?: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive == null
      ? theme.colors.text4
      : $positive
        ? theme.colors.palette.positive
        : theme.colors.palette.negative};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  ${({ $groupStart, theme }) => $groupStart && `border-left: 2px solid ${theme.colors.border};`}
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  margin-left: 4px;
  color: ${({ $isDown, theme }) =>
    $isDown ? theme.colors.palette.dangerDark : theme.colors.palette.successDark};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.title};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text4};
  margin-right: 4px;
  transition: transform 0.15s;
`

export const ChildTr = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  & > td {
    font-size: ${({ theme }) => theme.typography.fontSize.micro};
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
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

/* ─── Category Tabs ────────────── */

export const TabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing[1]};
`

export const TabButton = styled.button<{ $active: boolean; $color?: string }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg2 : 'transparent')};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.border : 'transparent')};
  border-bottom: ${({ $active, $color }) =>
    $active ? `3px solid ${$color ?? '#3b82f6'}` : '3px solid transparent'};
  border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg2};
  }
`

export const ToggleRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  user-select: none;
`

export const TrSubtotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  & > td {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  }
`

/* ─── Day-of-week styling ────────────── */

export const DowCell = styled(Td)<{ $dow: number }>`
  text-align: center;
  color: ${({ $dow, theme }) =>
    $dow === 0
      ? theme.colors.palette.danger
      : $dow === 6
        ? theme.colors.palette.info
        : theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`
