/**
 * KPIテーブルウィジェット用スタイルコンポーネント
 *
 * KpiTableWidgets.tsx から分割。
 */
import styled from 'styled-components'
import { STh, STd } from '../DashboardPage.styles'

/* ── 部門別KPI styled components ────────────────────── */

export const KpiGroupTh = styled(STh)`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const KpiSubTh = styled(STh)`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  white-space: nowrap;
`

export const BudgetTh = styled(KpiSubTh)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.12)'};
`

export const BudgetTd = styled(STd)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.06)'};
`

/* ── Warning banner for data completeness ────────────── */

export const KpiWarningBar = styled.div<{ $clickable?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.palette.warning};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.12)' : 'rgba(234,179,8,0.08)'};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.25)')};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 4px 8px;
  margin-bottom: 8px;
  line-height: 1.4;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: background 0.15s;
    &:hover {
      background: rgba(234,179,8,0.18);
      border-color: rgba(234,179,8,0.5);
    }
  `}
`

/* ── Editable cell styled components ────────────────── */

export const EditableCell = styled(STd)`
  padding: 0;
  position: relative;
`
export const CellInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  text-align: right;
  padding: 4px 8px;
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  box-sizing: border-box;
  &:focus {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'};
    box-shadow: inset 0 0 0 1.5px ${({ theme }) => theme.colors.palette.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text4};
    font-size: ${({ theme }) => theme.typography.fontSize.micro};
  }
  /* hide spin buttons */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`
export const EditHint = styled.span`
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.5;
  pointer-events: none;
`
export const KpiTooltip = styled.div`
  position: absolute;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  padding: 8px 12px;
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  line-height: 1.6;
  white-space: nowrap;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e1e2e' : theme.colors.palette.white)};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  bottom: calc(100% + 4px);
  right: 0;
`
export const TipLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: 6px;
`
export const TipVal = styled.span<{ $color?: string }>`
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color }) => $color ?? 'inherit'};
`

export const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const TableTitleText = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`
