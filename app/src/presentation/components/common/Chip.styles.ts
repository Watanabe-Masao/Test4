import styled from 'styled-components'

export const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const Chip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  min-width: 48px;
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text2)};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`
