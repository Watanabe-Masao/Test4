import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common'
export { EmptyState } from '@/presentation/components/common'

/* ─── Report Header ──────────────────────────────────── */

export const ReportHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 2px solid ${({ theme }) => theme.colors.palette.primary};
`

export const ReportDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/* ─── Section ────────────────────────────────────────── */

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media print {
    break-inside: avoid;
    margin-bottom: 16px;
  }
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

/* ─── Summary Grid ───────────────────────────────────── */

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }

  @media print {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`

/* ─── Table ──────────────────────────────────────────── */

export const TableWrapper = DataTableWrapper

export const Table = DataTable

export const Th = styled(DataTh)`
  &:first-child {
    text-align: left;
  }
`

export const Td = styled(DataTd)<{ $accent?: boolean }>`
  color: ${({ $accent, theme }) => ($accent ? theme.colors.palette.primary : theme.colors.text)};
  font-weight: ${({ $accent, theme }) => ($accent ? theme.typography.fontWeight.bold : 'normal')};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`

export const Tr = DataTr

export const TotalRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

/* ─── Calc Rows (P&L Card) ───────────────────────────── */

export const CalcRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  ${({ $clickable, theme }) =>
    $clickable &&
    `
    cursor: pointer;
    border-radius: ${theme.radii.sm};
    padding: ${theme.spacing[3]} ${theme.spacing[2]};
    margin: 0 -${theme.spacing[2]};
    transition: background ${theme.transitions.fast};
    &:hover {
      background: ${theme.colors.bg4};
    }
    &:hover span:last-child {
      text-decoration: underline;
      text-decoration-style: dotted;
    }
  `}
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

export const DisclaimerNote = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

/* ─── Export Bar ─────────────────────────────────────── */

export const ExportBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
  }

  @media print {
    display: none;
  }
`

/* ─── Department KPI ─────────────────────────────────── */

export const DeptTd = styled.td<{ $warn?: boolean; $good?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $warn, $good, theme }) =>
    $good ? theme.colors.palette.success : $warn ? theme.colors.palette.danger : theme.colors.text};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`
