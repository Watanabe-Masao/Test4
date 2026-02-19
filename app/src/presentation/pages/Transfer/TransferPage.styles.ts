import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const Th = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: left; }
`

export const Td = styled.td<{ $negative?: boolean; $positive?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $negative, $positive, theme }) =>
    $negative ? theme.colors.palette.danger
    : $positive ? sc.positive
    : theme.colors.text};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const Tr = styled.tr<{ $clickable?: boolean; $expanded?: boolean }>`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  ${({ $expanded, theme }) => $expanded && `
    background: ${theme.colors.palette.primary}10;
    &:hover { background: ${theme.colors.palette.primary}18; }
  `}
`

export const TrDetail = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
  td {
    padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text3};
    border-bottom: none;
  }
`

export const TrDetailLast = styled(TrDetail)`
  td {
    padding-bottom: ${({ theme }) => theme.spacing[3]};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`

export const DetailLabel = styled.span<{ $sub?: boolean }>`
  display: inline-block;
  min-width: 80px;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text4};
  ${({ $sub, theme }) => $sub && `
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.text3};
  `}
`

export const ToggleIcon = styled.span<{ $expanded?: boolean }>`
  display: inline-block;
  margin-right: 4px;
  font-size: 0.6rem;
  transition: transform 0.15s ease;
  ${({ $expanded }) => $expanded && `transform: rotate(90deg);`}
`

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  td { font-weight: ${({ theme }) => theme.typography.fontWeight.bold}; }
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`
