import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

export const Separator = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`
export const EmptyFilterMsg = styled.div`
  text-align: center;
  padding: 40px 16px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Card = styled.div<{ $accent?: string }>`
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 3px solid ${({ $accent }) => $accent ?? '#888'};
`

export const CardLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 2px;
`

export const CardValue = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`

export const CardSub = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const YoYBadge = styled.span<{ $positive: boolean }>`
  font-size: 0.55rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: ${({ $positive, theme }) =>
    $positive ? `${theme.colors.palette.success}26` : `${theme.colors.palette.danger}26`};
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.palette.successDark : theme.colors.palette.dangerDark};
`

export const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const MetricLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
`

export const MetricValue = styled.div<{ $color?: string }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ProgressBarWrap = styled.div`
  flex: 1;
  min-width: 120px;
  max-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ProgressTrack = styled.div`
  height: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  border-radius: 3px;
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.6s ease;
`

export const ProgressLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const InsightBar = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)'};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const InsightItem = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.5;
  &::before {
    content: '• ';
    color: ${({ theme }) => theme.colors.palette.primary};
    font-weight: 700;
  }
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: ${({ theme }) => theme.spacing[3]};
`

export const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
`

export const MiniTh = styled.th`
  text-align: right;
  padding: 4px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

export const MiniTd = styled.td<{ $highlight?: boolean; $positive?: boolean }>`
  text-align: right;
  padding: 3px 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $highlight, $positive, theme }) =>
    $highlight
      ? $positive
        ? theme.colors.palette.successDark
        : theme.colors.palette.dangerDark
      : theme.colors.text2};
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')};
  &:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    color: ${({ theme }) => theme.colors.text2};
  }
`
