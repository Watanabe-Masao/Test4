import styled from 'styled-components'

export const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 0.65rem;
`

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  white-space: nowrap;
`

export const DateInput = styled.input`
  padding: 2px 6px;
  font-size: 0.65rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &::-webkit-calendar-picker-indicator {
    opacity: 0.6;
    cursor: pointer;
    filter: ${({ theme }) => (theme.mode === 'dark' ? 'invert(1)' : 'none')};
  }
`

export const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text4};
`

export const PresetButton = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const DaysInfo = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`
