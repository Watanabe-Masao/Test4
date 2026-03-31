import styled from 'styled-components'

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`

export const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

export const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  min-width: 24px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark' ? `${theme.colors.palette.primary}33` : `${theme.colors.palette.primary}14`
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const ResetChip = styled(Chip)`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`
