import styled from 'styled-components'

export const Card = styled.div<{ $accent?: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;

  ${({ $accent }) => $accent && `
    border-top: 2px solid ${$accent};
  `}
`

export const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
