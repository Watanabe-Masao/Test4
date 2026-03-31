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
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Subtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

export const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

export const ControlGroup = styled.div<{ $hidden?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
  pointer-events: ${({ $hidden }) => ($hidden ? 'none' : 'auto')};
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
  gap: 4px;
  align-items: center;
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
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

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`

export const MapLegend = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
`

export const LegendItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

export const FilterSelect = styled.select`
  padding: 2px 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff')};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  max-width: 140px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`
