import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

/* ── Styled ─────────────────────────────────────────── */

export const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`

export const BreadcrumbItem = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  padding: 2px 6px;
  font-size: 0.7rem;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.palette.primary)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  text-decoration: ${({ $active }) => ($active ? 'none' : 'underline')};
  &:hover {
    opacity: 0.7;
  }
`

export const BreadcrumbSep = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
`

export const LegendRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
  justify-content: center;
`

export const LegendItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text2};
`

export const LegendDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`

export const DecompRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`

export const DecompBtn = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary + '18' : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text2)};
  font-size: 0.6rem;
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  &:hover {
    opacity: 0.8;
  }
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
  margin-top: 8px;

  th,
  td {
    padding: 4px 6px;
    text-align: right;
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.colors.text3};
    font-weight: 500;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  td:first-child,
  th:first-child {
    text-align: left;
  }

  tbody tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.bg4};
  }

  tbody tr:hover {
    background: ${({ theme }) => theme.colors.bg2};
  }

  tfoot tr {
    border-top: 2px solid ${({ theme }) => theme.colors.border};
  }

  tfoot th {
    font-weight: 600;
  }
`

export const DrillIcon = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.6rem;
  margin-left: 2px;
`

export const NameCell = styled.td<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  color: ${({ $clickable, theme }) =>
    $clickable ? theme.colors.palette.primary : theme.colors.text};
  font-weight: 500;
  &:hover {
    ${({ $clickable }) => $clickable && 'text-decoration: underline;'}
  }
`

export const ValCell = styled.td<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/* ── Tooltip ────────────────────────────────────────── */

export const TipBox = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
`

export const TipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`

export const TipRow = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color ?? 'inherit'};
`

export const TipHint = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 4px;
`

/* ── Utilities ──────────────────────────────────────── */

export const valColor = (v: number) => sc.cond(v >= 0)
