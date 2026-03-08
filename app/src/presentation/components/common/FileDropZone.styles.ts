import styled from 'styled-components'

export const Zone = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed
    ${({ $isDragOver, theme }) =>
      $isDragOver ? theme.colors.palette.success : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: ${({ $isDragOver, theme }) =>
    $isDragOver ? `${theme.colors.palette.success}10` : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) => theme.colors.palette.primary}08;
  }
`

export const FolderButton = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  border: 1px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary}12;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const Icon = styled.div`
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const MainText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const HintText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[2]};
`
