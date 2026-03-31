import styled from 'styled-components'

export const StatusTable = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[3]};
  justify-content: center;
`

export const StatusBadge = styled.span<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  font-weight: 600;
`

export const HeatmapGrid = styled.div`
  overflow-x: auto;
  margin-top: ${({ theme }) => theme.spacing[2]};
`

export const HeatmapTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

export const HeatmapTh = styled.th`
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const HeatmapRowHeader = styled.td`
  padding: 3px 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const HeatmapCell = styled.td<{ $bg: string; $textColor: string }>`
  padding: 2px 4px;
  text-align: center;
  background: ${({ $bg }) => $bg};
  color: ${({ $textColor }) => $textColor};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  min-width: 32px;
`
