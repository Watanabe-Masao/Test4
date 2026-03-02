import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common'
export { Section, SectionTitle } from '@/presentation/components/common'
export { EmptyState } from '@/presentation/components/common'

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const TableWrapper = DataTableWrapper

export const Table = DataTable

export const Th = styled(DataTh)`
  &:first-child {
    text-align: left;
  }
`

export const Td = styled(DataTd)`
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`

export const Tr = DataTr

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[3]};
`

export const ToggleBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const ToggleLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const PieWrapper = styled.div`
  width: 100%;
  height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const PieTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

export const PieToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const CategorySelect = styled.select`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const CustomCategoryBadge = styled.span`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing[0]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-left: ${({ theme }) => theme.spacing[2]};
`

export const ChartWrapper = styled.div`
  width: 100%;
  height: 320px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

/* ── 新規: KPIサマリー行 ── */
export const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`

/* ── 新規: 条件付きカラーリング — 値入率セル ── */
export const MarkupCell = styled.td<{ $rate: number }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $rate, theme }) =>
    $rate >= 0.3
      ? theme.colors.palette.success
      : $rate >= 0.2
        ? theme.colors.palette.warning
        : $rate > 0
          ? theme.colors.palette.danger
          : theme.colors.text3};
`

/* ── 新規: 粗利額セル ── */
export const GrossProfitCell = styled.td<{ $positive: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.palette.success : theme.colors.palette.danger};
`

/* ── 新規: ソートボタン ── */
export const SortButton = styled.button`
  all: unset;
  cursor: pointer;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text3};
  transition: color ${({ theme }) => theme.transitions.fast};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

/* ── 新規: 取引先フィルター ── */
export const SupplierToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const SupplierFilterInput = styled.input`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  width: 100%;
  max-width: 200px;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text4};
  }
`

/* ── ドリルダウン用 ── */
export const DrillTr = styled.tr<{
  $clickable?: boolean
  $expanded?: boolean
  $depth?: number
  $catColor?: string
}>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background ${({ theme }) => theme.transitions.fast};
  ${({ $expanded, theme }) =>
    $expanded &&
    `
    background: ${theme.colors.palette.primary}10;
    &:hover { background: ${theme.colors.palette.primary}18; }
  `}
  ${({ $depth, $catColor, theme }) =>
    $depth &&
    $depth > 0 &&
    `
    background: ${theme.colors.bg3};
    animation: drillFadeIn 0.2s ease;
    td { font-size: ${theme.typography.fontSize.xs}; }
    td:first-child {
      border-left: 2px solid ${$catColor ?? theme.colors.palette.primary};
    }
  `}
  ${({ $depth, $catColor, theme }) =>
    $depth &&
    $depth > 1 &&
    `
    background: ${theme.colors.bg4};
    td { font-size: ${theme.typography.fontSize.xs}; color: ${theme.colors.text3}; }
    td:first-child {
      border-left: 2px solid ${$catColor ?? theme.colors.palette.primary};
    }
  `}
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
  @keyframes drillFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const DrillToggle = styled.span<{ $expanded?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  transition:
    transform 0.2s ease,
    color 0.2s ease;
  color: ${({ $expanded, theme }) =>
    $expanded ? theme.colors.palette.primary : theme.colors.text3};
  ${({ $expanded }) => $expanded && `transform: rotate(90deg);`}
`

export const DrillLabel = styled.span<{ $depth?: number }>`
  padding-left: ${({ $depth }) => ($depth ?? 0) * 20}px;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`
