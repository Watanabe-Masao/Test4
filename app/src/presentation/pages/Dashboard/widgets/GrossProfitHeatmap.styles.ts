import styled from 'styled-components'

export const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  overflow-x: auto;
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const ToggleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

export const Toggle = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.bg : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.palette.primary
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.04)'};
  &:hover {
    opacity: 0.85;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const HeatTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  table-layout: fixed;
`

export const HeatTh = styled.th`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[1]}`};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`

export const HeatThStore = styled(HeatTh)`
  text-align: left;
  width: 80px;
  min-width: 80px;
`

export const HeatTd = styled.td<{ $bg: string; $textColor: string }>`
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  text-align: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ $bg }) => $bg};
  color: ${({ $textColor }) => $textColor};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')};
  cursor: default;
  position: relative;
  &:hover {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -1px;
    z-index: 1;
  }
`

export const HeatTdStore = styled.td`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const EmptyCell = styled.td`
  padding: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')};
`

export const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

export const LegendSwatch = styled.div<{ $bg: string }>`
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: ${({ $bg }) => $bg};
  border: 1px solid rgba(0, 0, 0, 0.1);
`
