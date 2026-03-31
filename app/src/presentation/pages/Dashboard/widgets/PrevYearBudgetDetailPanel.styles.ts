import styled from 'styled-components'
import { MbpTh, MbpTd } from '@/presentation/components/common/MetricBreakdownPanel.styles'

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
`

export const SummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const SummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const SummarySub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

export const PeriodInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

export const PeriodItem = styled.span`
  white-space: nowrap;
`

export const WeekRow = styled.tr`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ theme }) => `${theme.colors.palette.primary}08`};
  td {
    border-top: 1px solid ${({ theme }) => `${theme.colors.palette.primary}20`};
    font-size: ${({ theme }) => theme.typography.fontSize.micro};
  }
`

export const TotalRow = styled.tr`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ theme }) => theme.colors.bg3};
  td {
    border-top: 2px solid ${({ theme }) => theme.colors.border};
  }
`

export const NumTd = styled(MbpTd)`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const NumTh = styled(MbpTh)`
  text-align: right;
`

export const DowTd = styled(MbpTd)<{ $dow: number }>`
  color: ${({ $dow, theme }) =>
    $dow === 0
      ? theme.colors.palette.danger
      : $dow === 6
        ? theme.colors.palette.primary
        : theme.colors.text2};
  font-weight: ${({ $dow, theme }) =>
    $dow === 0 || $dow === 6 ? theme.typography.fontWeight.semibold : 'normal'};
`

export const RatioCell = styled(NumTd)<{ $ratio: number }>`
  color: ${({ $ratio, theme }) =>
    $ratio > 1.05
      ? theme.colors.palette.success
      : $ratio < 0.95
        ? theme.colors.palette.danger
        : theme.colors.text2};
`

export const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin: ${({ theme }) => theme.spacing[4]} 0 ${({ theme }) => theme.spacing[2]};
`

export const DowGapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DowGapCell = styled.div<{ $diff: number }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $diff, theme }) =>
    $diff > 0
      ? `${theme.colors.palette.success}12`
      : $diff < 0
        ? `${theme.colors.palette.danger}12`
        : theme.colors.bg3};
`

export const DowGapLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

export const DowGapDiff = styled.div<{ $diff: number }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $diff, theme }) =>
    $diff > 0
      ? theme.colors.palette.success
      : $diff < 0
        ? theme.colors.palette.danger
        : theme.colors.text4};
`

export const DowGapCount = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
`

export const MethodToggleBar = styled.div`
  display: inline-flex;
  gap: 0;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`

export const MethodButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : 'normal'};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text2)};
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  &:not(:last-child) {
    border-right: 1px solid ${({ theme }) => theme.colors.border};
  }
  &:hover:not([disabled]) {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.palette.primary : theme.colors.bg3};
  }
`

export const ShiftedDayTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  th,
  td {
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  th {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) => theme.colors.bg3};
  }
`

export const ShiftedDayNumTd = styled.td`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ShiftedDaySummary = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  align-items: center;
`

export const ShiftedDayLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: normal;
  color: ${({ theme }) => theme.colors.text3};
  margin-right: ${({ theme }) => theme.spacing[1]};
`
