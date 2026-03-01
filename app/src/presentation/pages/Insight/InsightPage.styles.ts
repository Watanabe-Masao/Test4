import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common'
export { TabBar, Tab } from '@/presentation/components/common'
export { Section, SectionTitle } from '@/presentation/components/common'

export const ChartSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
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

export const ToggleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const ModeToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

/* ─── Table ─────────────────────────────────────────── */

export const TableWrapper = styled(DataTableWrapper)`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const Table = DataTable

export const Th = DataTh

export const Td = DataTd

export const Tr = DataTr

export { EmptyState } from '@/presentation/components/common'

/* ─── Summary (粗利計算) ────────────────────────────── */

export const CalcGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const CalcRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const CalcLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

export const CalcValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const CalcHighlight = styled(CalcValue)<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`

export const Formula = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

/* ─── Forecast (予測パターン) ───────────────────────── */

export const ColorPickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const ColorPickerTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

export const ColorPickerLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  cursor: pointer;
`

export const ColorInput = styled.input`
  width: 28px;
  height: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px;
  cursor: pointer;
  background: transparent;
  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }
`

export const AnomalyBadge = styled.span<{ $type: 'high' | 'low' }>`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $type, theme }) =>
    $type === 'high' ? `${theme.colors.palette.success}20` : `${theme.colors.palette.danger}20`};
  color: ${({ $type, theme }) =>
    $type === 'high' ? theme.colors.palette.success : theme.colors.palette.danger};
`

/* ─── Forecast Table (週別サマリー) ─────────────────── */

export const FcTr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const FcTd = styled.td<{ $highlight?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.palette.warning : theme.colors.text};
  font-weight: ${({ $highlight, theme }) =>
    $highlight ? theme.typography.fontWeight.bold : 'normal'};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  &:first-child {
    text-align: center;
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const FcTh = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: center;
  }
`

export const FcTableWrapper = DataTableWrapper

export const FcTable = DataTable

export const FcTrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  td {
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }
`
