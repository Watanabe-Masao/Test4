import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
`

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ControlLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

export const ButtonGroup = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? `${theme.colors.palette.primary}33`
        : `${theme.colors.palette.primary}14`
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const StoreChip = styled.button<{ $active: boolean; $color: string }>`
  padding: 2px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, $color }) => ($active ? `${$color}18` : 'transparent')};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text4)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  &:hover {
    opacity: 1;
  }
`

export const StoreDotInline = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

export const CompTable = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
`

export const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const MiniTh = styled.th<{ $sortable?: boolean }>`
  text-align: center;
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:first-child {
    text-align: left;
  }
  &:hover {
    color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : theme.colors.text3)};
  }
`

export const MiniTd = styled.td`
  text-align: center;
  padding: 2px 5px;
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')};
  white-space: nowrap;
  &:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  }
`

export const StoreDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
  vertical-align: middle;
`

export const RankBadge = styled.span<{ $rank: number }>`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: 700;
  width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  border-radius: 50%;
  margin-right: 3px;
  color: ${({ theme }) => theme.colors.palette.white};
  background: ${({ $rank }) =>
    $rank === 1 ? '#f59e0b' : $rank === 2 ? '#94a3b8' : $rank === 3 ? '#b45309' : '#64748b'};
`
