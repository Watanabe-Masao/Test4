import styled from 'styled-components'

export const Card = styled.div<{ $accent?: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition:
    box-shadow ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};
  position: relative;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: ${({ theme }) => theme.interaction.hoverLift};
  }

  ${({ $accent }) =>
    $accent &&
    `
    border-top: 2px solid ${$accent};
  `}
`

export const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
