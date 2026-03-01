import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

/* ─── Tab Bar ───────────────────────────────────────── */

export const TabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}10` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg3};
  }
`

/* ─── Common ────────────────────────────────────────── */

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
  &:first-child {
    text-align: left;
  }
`

export const Td = styled.td<{ $negative?: boolean; $positive?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $negative, $positive, theme }) =>
    $negative ? theme.colors.palette.danger : $positive ? sc.positive : theme.colors.text};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
  }
`

/** 消耗品タブ用 Td（$muted 対応） */
export const ConsumTd = styled.td<{ $muted?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $muted, theme }) => ($muted ? theme.colors.text4 : theme.colors.text)};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const Tr = styled.tr<{ $clickable?: boolean; $expanded?: boolean; $selected?: boolean }>`
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  ${({ $expanded, $selected, theme }) =>
    ($expanded || $selected) &&
    `
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
  td {
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

/* ─── Pivot Table (store × date matrix) ────────────── */

export const PivotGroupTh = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: center;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`

export const PivotSubTh = styled.th`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &.group-start {
    border-left: 2px solid ${({ theme }) => theme.colors.border};
  }
`

export const PivotTd = styled(Td)<{ $groupStart?: boolean }>`
  ${({ $groupStart, theme }) =>
    $groupStart && `border-left: 2px solid ${theme.colors.border};`}
`

/* ─── Flow Pair Table ───────────────────────────────── */

export const FlowTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const FlowTh = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
  &:nth-child(2) {
    text-align: left;
  }
  &:last-child {
    width: 100px;
  }
`

export const FlowTd = styled.td<{ $negative?: boolean; $label?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $negative, theme }) => ($negative ? theme.colors.palette.danger : theme.colors.text)};
  ${({ $label, theme }) =>
    $label &&
    `
    text-align: left;
    font-family: ${theme.typography.fontFamily.primary};
    color: ${theme.colors.text2};
  `}
  &:last-child {
    width: 100px;
  }
`

export const FlowTr = styled.tr<{ $active?: boolean }>`
  cursor: pointer;
  transition: background 0.1s;
  ${({ $active, theme }) =>
    $active &&
    `
    background: ${theme.colors.palette.primary}14;
    td { font-weight: ${theme.typography.fontWeight.bold}; }
  `}
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const FlowGroupHeader = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
  td {
    padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text3};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`

export const FlowBar = styled.div<{ $pct: number; $dir: 'in' | 'out' | 'neutral' }>`
  height: 8px;
  width: ${({ $pct }) => Math.max($pct, 2)}%;
  border-radius: 4px;
  background: ${({ $dir, theme }) =>
    $dir === 'in'
      ? theme.colors.palette.blueDark
      : $dir === 'out'
        ? theme.colors.palette.dangerDark
        : theme.colors.palette.slate};
  opacity: 0.7;
`

/* ─── Consumable-specific ───────────────────────────── */

export const Bar = styled.div<{ $width: number; $color: string }>`
  display: inline-block;
  width: ${({ $width }) => $width}%;
  max-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
  vertical-align: middle;
`

export const RankBadge = styled.span<{ $rank: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  background: ${({ $rank, theme }) =>
    $rank === 1
      ? theme.colors.palette.warningDark
      : $rank === 2
        ? theme.colors.palette.slate
        : $rank === 3
          ? theme.colors.palette.warningDeep
          : 'transparent'};
  color: ${({ $rank, theme }) => ($rank <= 3 ? 'white' : theme.colors.text4)};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

export const PairGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`
