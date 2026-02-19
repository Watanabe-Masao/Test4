import styled, { css } from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const ChartToggle = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
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

const clickableHeaderCss = css`
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const Th = styled.th<{ $clickable?: boolean; $expanded?: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 5;

  &:first-child {
    text-align: center;
    position: sticky;
    left: 0;
    z-index: 6;
    background: ${({ theme }) => theme.colors.bg2};
  }

  ${({ $clickable }) => $clickable && clickableHeaderCss}
  ${({ $expanded, theme }) => $expanded && css`
    color: ${theme.colors.palette.primary};
  `}
`

export const SubTh = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 4;
`

export const Td = styled.td<{ $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $negative, theme }) => $negative ? theme.colors.palette.danger : theme.colors.text};

  &:first-child {
    text-align: center;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
    position: sticky;
    left: 0;
    background: ${({ theme }) => theme.colors.bg3};
    z-index: 3;
  }
`

export const SubTd = styled.td<{ $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $negative, theme }) => $negative ? theme.colors.palette.danger : theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const Tr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const PrevYearTd = styled.td<{ $positive?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $positive, theme }) =>
    $positive === undefined ? theme.colors.text3 : $positive ? sc.positive : sc.negative};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export const ToggleIcon = styled.span<{ $expanded?: boolean }>`
  display: inline-block;
  margin-left: 2px;
  font-size: 0.6rem;
  transition: transform ${({ theme }) => theme.transitions.fast};
  ${({ $expanded }) => $expanded && css`transform: rotate(90deg);`}
`
