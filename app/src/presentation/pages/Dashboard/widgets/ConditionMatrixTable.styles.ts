import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import type { TrendDirection } from '@/application/hooks/duckdb/useConditionMatrix'

export const Section = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h5`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
`

export const MTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

export const MTh = styled.th`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

export const MTd = styled.td<{ $color?: string; $bold?: boolean }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    font-size: ${({ theme }) => theme.typography.fontSize.micro};
  }
`

export const MTr = styled.tr<{ $separator?: boolean }>`
  ${({ $separator, theme }) =>
    $separator &&
    `
    border-top: 2px solid ${theme.colors.border};
  `}
`

export const LoadingMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

export const ErrorMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  color: ${palette.danger};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

export const WarningMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)'};
  border: 1px solid ${palette.caution};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${palette.caution};
`

export const DirectionArrow = styled.span<{ $dir: TrendDirection }>`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: 700;
  color: ${({ $dir }) =>
    $dir === 'up' ? palette.positive : $dir === 'down' ? palette.negative : palette.slate};
`
