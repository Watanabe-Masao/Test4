import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

export const Wrapper = styled.div`
  width: 100%;
  height: 420px;
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
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? `${palette.white}14`
          : `${palette.black}0f`};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const Sep = styled.span`
  opacity: 0.4;
  padding: 3px 2px;
  cursor: default;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
`

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const SummaryItem = styled.div<{ $positive?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.palette.success : theme.colors.palette.danger};
`

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-right: 4px;
`
