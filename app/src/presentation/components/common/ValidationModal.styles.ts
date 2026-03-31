import styled from 'styled-components'
import type { ValidationMessage } from '@/domain/models/record'

export const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const MessageItem = styled.div<{ $level: ValidationMessage['level'] }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  background: ${({ $level, theme }) =>
    $level === 'error'
      ? `${theme.colors.palette.danger}18`
      : $level === 'warning'
        ? `${theme.colors.palette.warning}18`
        : `${theme.colors.palette.primary}18`};
  border-left: 3px solid
    ${({ $level, theme }) =>
      $level === 'error'
        ? theme.colors.palette.danger
        : $level === 'warning'
          ? theme.colors.palette.warning
          : theme.colors.palette.primary};
  color: ${({ theme }) => theme.colors.text};
`

export const MessageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const LevelBadge = styled.span<{ $level: ValidationMessage['level'] }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-transform: uppercase;
  white-space: nowrap;
  color: ${({ $level, theme }) =>
    $level === 'error'
      ? theme.colors.palette.danger
      : $level === 'warning'
        ? theme.colors.palette.warning
        : theme.colors.palette.primary};
`

export const DetailsToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: ${({ theme }) => theme.spacing[8]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  max-height: 150px;
  overflow-y: auto;
`

export const DetailLine = styled.div`
  line-height: 1.4;
`

export const NextStepsBox = styled.div<{ $variant: 'success' | 'warning' | 'error' }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-top: ${({ theme }) => theme.spacing[4]};
  background: ${({ $variant, theme }) =>
    $variant === 'success'
      ? `${theme.colors.palette.success}12`
      : $variant === 'warning'
        ? `${theme.colors.palette.warning}12`
        : `${theme.colors.palette.danger}12`};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'success'
        ? `${theme.colors.palette.success}30`
        : $variant === 'warning'
          ? `${theme.colors.palette.warning}30`
          : `${theme.colors.palette.danger}30`};
`

export const NextStepsTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const NextStepsText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.6;
`
