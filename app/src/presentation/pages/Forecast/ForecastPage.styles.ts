import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common/tables'
export { Section, SectionTitle } from '@/presentation/components/common/layout'
export { EmptyState } from '@/presentation/components/common/layout'

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

export const TableWrapper = DataTableWrapper

export const Table = DataTable

export const Th = DataTh

export const Td = styled(DataTd)<{ $highlight?: boolean }>`
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.palette.warning : theme.colors.text};
  font-weight: ${({ $highlight, theme }) =>
    $highlight ? theme.typography.fontWeight.bold : 'normal'};
`

export const Tr = DataTr

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  td {
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }
`

export const AnomalyBadge = styled.span<{ $type: 'high' | 'low' }>`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $type, theme }) =>
    $type === 'high' ? `${theme.colors.palette.success}20` : `${theme.colors.palette.danger}20`};
  color: ${({ $type, theme }) =>
    $type === 'high' ? theme.colors.palette.success : theme.colors.palette.danger};
`

export const ModeToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

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

export const ColorPickerLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
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

export const ColorPickerTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-right: ${({ theme }) => theme.spacing[2]};
`
