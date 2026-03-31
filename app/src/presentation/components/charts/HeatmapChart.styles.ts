import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const Subtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const GridContainer = styled.div`
  overflow-x: auto;
`

export const HeatmapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const HeaderCell = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const RowHeader = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`

export const DataCell = styled.td<{ $bgColor: string; $isAnomaly: boolean; $textColor: string }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ $textColor }) => $textColor};
  background: ${({ $bgColor }) => $bgColor};
  border: ${({ $isAnomaly, theme }) =>
    $isAnomaly ? `2px solid ${theme.colors.palette.dangerDark}` : '1px solid transparent'};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s;
  min-width: 60px;

  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

export const LegendBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
`

export const GradientBar = styled.div<{ $from: string; $to: string }>`
  width: 100px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, ${({ $from }) => $from}, ${({ $to }) => $to});
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`

export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
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
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const HierarchyRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

export const HierarchySelect = styled.select`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
`

/** 前年比用セル: 緑(+) / 赤(-) のグラデーション */
export const DiffDataCell = styled.td<{ $ratio: number; $hasData: boolean; $textColor: string }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ $textColor }) => $textColor};
  background: ${({ $ratio, $hasData }) => {
    if (!$hasData) return 'transparent'
    if ($ratio === 0) return 'rgba(100,100,100,0.1)'
    const absR = Math.min(Math.abs($ratio), 0.5) / 0.5
    if ($ratio > 0) return `rgba(34,197,94,${0.2 + absR * 0.7})`
    return `rgba(239,68,68,${0.2 + absR * 0.7})`
  }};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s;
  min-width: 60px;
  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`
