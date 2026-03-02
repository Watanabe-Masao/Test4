import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  overflow: hidden;
`
export const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`
export const BreadcrumbItem = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.palette.primary)};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
`
export const BreadcrumbSep = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  user-select: none;
`
export const ResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  margin-left: auto;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    opacity: 0.7;
  }
`
export const SummaryBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`
export const SummaryItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`
export const SummaryLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`
export const SummaryValue = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
export const TreemapWrap = styled.div`
  display: flex;
  gap: 2px;
  height: 64px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`
export const TreemapBlock = styled.div<{ $flex: number; $color: string; $canDrill: boolean }>`
  flex: ${({ $flex }) => Math.max($flex, 0.01)};
  min-width: 0;
  background: ${({ $color }) => $color};
  opacity: 0.8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  cursor: ${({ $canDrill }) => ($canDrill ? 'pointer' : 'default')};
  transition: opacity 0.15s;
  overflow: hidden;
  &:hover {
    opacity: 1;
  }
`
export const TreemapLabel = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.palette.white};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`
export const TreemapPct = styled.div`
  font-size: 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-family: monospace;
`
export const EmptyFilterMsg = styled.div`
  text-align: center;
  padding: 40px 16px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`
export const TableWrap = styled.div`
  overflow-x: auto;
`
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
`
export const Th = styled.th<{ $sortable?: boolean }>`
  text-align: left;
  padding: 6px 8px;
  font-size: 0.6rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:hover {
    color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : undefined)};
  }
`
export const Tr = styled.tr<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.1s;
  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.02)'
        : 'none'};
  }
`
export const Td = styled.td<{ $mono?: boolean }>`
  padding: 5px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ $mono, theme }) =>
    $mono ? theme.typography.fontFamily.mono : theme.typography.fontFamily.primary};
  white-space: nowrap;
`
export const TdName = styled(Td)`
  max-width: 160px;
`
export const NameMain = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
export const NameCode = styled.div`
  font-size: 0.52rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
export const TdAmount = styled(Td)`
  min-width: 160px;
`
export const AmtWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
export const AmtTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`
export const AmtFill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  opacity: 0.75;
`
export const AmtVal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.62rem;
  color: ${({ theme }) => theme.colors.text2};
  min-width: 70px;
  text-align: right;
`
export const PeakBadge = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.58rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'};
  color: ${({ theme }) => theme.colors.palette.primary};
`
export const TdSpark = styled(Td)`
  min-width: 130px;
  padding: 3px 8px;
`
export const DrillBtn = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-size: 0.7rem;
  font-weight: 600;
`
export const DrillCount = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
export const YoYBadge = styled.span<{ $positive: boolean }>`
  font-size: 0.55rem;
  font-weight: 600;
  color: ${({ $positive }) => sc.cond($positive)};
`
export const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`
export const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`
export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`
export const YoYBar = styled.div<{ $pct: number; $positive: boolean }>`
  display: inline-block;
  height: 4px;
  border-radius: 2px;
  width: ${({ $pct }) => Math.min(Math.abs($pct), 100)}%;
  background: ${({ $positive }) => sc.cond($positive)};
  opacity: 0.6;
`
export const AnomalyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.52rem;
  font-weight: 600;
  background: ${sc.negative}1f;
  color: ${sc.negative};
`
export const PiValueBadge = styled.span<{ $below: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.58rem;
  color: ${({ $below }) => ($below ? sc.negative : 'inherit')};
  background: ${({ $below }) => ($below ? `${sc.negative}14` : 'transparent')};
  padding: ${({ $below }) => ($below ? '0 3px' : '0')};
  border-radius: 2px;
`
export const ThWithTip = styled(Th)`
  position: relative;
`
export const TipIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  margin-left: 3px;
  vertical-align: middle;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  color: ${({ theme }) => theme.colors.text3};
  cursor: help;
`
export const TipBubble = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: 200px;
  padding: 8px 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e293b' : theme.colors.palette.white)};
  color: ${({ theme }) => theme.colors.text2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.58rem;
  font-weight: 400;
  white-space: normal;
  line-height: 1.5;
  ${ThWithTip}:hover & {
    display: block;
  }
`
