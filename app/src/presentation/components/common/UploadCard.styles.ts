import styled from 'styled-components'

export const CardWrapper = styled.div<{ $loaded: boolean }>`
  border: 1px ${({ $loaded }) => ($loaded ? 'solid' : 'dashed')}
    ${({ $loaded, theme }) => ($loaded ? theme.colors.palette.success : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[2]};
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: ${({ $loaded, theme }) =>
    $loaded ? `${theme.colors.palette.success}08` : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const Icon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const Name = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Status = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.success};
  margin-top: ${({ theme }) => theme.spacing[1]};
`
