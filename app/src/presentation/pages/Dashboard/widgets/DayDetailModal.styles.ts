/**
 * DayDetailModal 用 styled-components
 *
 * DayDetailModal.tsx から分離し、スタイル定義を一元管理する。
 */
import styled from 'styled-components'

/* ── Drilldown Styled Components ─────────── */

export const DrillSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const DrillBreadcrumb = styled.div`
  display: flex; align-items: center; gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[3]}; flex-wrap: wrap;
`
export const BcItem = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.72rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active, theme }) => $active ? theme.colors.text : theme.colors.palette.primary};
  padding: 2px 6px; border-radius: ${({ theme }) => theme.radii.sm};
  &:hover { background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; }
`
export const BcSep = styled.span`font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4}; user-select: none;`
export const BcReset = styled.button`
  all: unset; cursor: pointer; font-size: 0.6rem; margin-left: auto;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.7; }
`

export const DrillTreemap = styled.div`
  display: flex; gap: 2px; height: 52px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md}; overflow: hidden;
`
export const TreeBlock = styled.div<{ $flex: number; $color: string; $canDrill: boolean }>`
  flex: ${({ $flex }) => Math.max($flex, 0.01)}; min-width: 0;
  background: ${({ $color }) => $color}; opacity: 0.8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 4px; cursor: ${({ $canDrill }) => ($canDrill ? 'pointer' : 'default')};
  transition: opacity 0.15s; overflow: hidden;
  &:hover { opacity: 1; }
`
export const TreeLabel = styled.div`
  font-size: 0.55rem; color: #fff; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
`
export const TreePct = styled.div`font-size: 0.5rem; color: rgba(255,255,255,0.85); font-family: monospace;`

export const DrillTable = styled.table`width: 100%; border-collapse: collapse; font-size: 0.65rem;`
export const DTh = styled.th<{ $sortable?: boolean }>`
  text-align: left; padding: 5px 6px; font-size: 0.6rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap; cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:hover { color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : undefined)}; }
`
export const DTr = styled.tr<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.1s;
  &:hover { background: ${({ $clickable, theme }) =>
    $clickable ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'none'}; }
`
export const DTd = styled.td<{ $mono?: boolean }>`
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ $mono, theme }) => $mono ? theme.typography.fontFamily.mono : theme.typography.fontFamily.primary};
  white-space: nowrap;
`
export const DTdName = styled(DTd)`
  max-width: 140px; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500; color: ${({ theme }) => theme.colors.text};
`
export const DTdAmt = styled(DTd)`min-width: 120px;`
export const AmtWrap = styled.div`display: flex; align-items: center; gap: 4px;`
export const AmtTrack = styled.div`
  flex: 1; height: 5px; border-radius: 3px; overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`
export const AmtFill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => Math.min($pct, 100)}%; height: 100%;
  background: ${({ $color }) => $color}; border-radius: 3px; opacity: 0.75;
`
export const AmtVal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text2};
  min-width: 60px; text-align: right;
`
export const DrillArrow = styled.span`
  color: ${({ theme }) => theme.colors.palette.primary}; font-size: 0.7rem; font-weight: 600;
`
export const YoYVal = styled.span<{ $positive: boolean }>`
  font-size: 0.58rem; font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
`
export const SummaryRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]}; flex-wrap: wrap;
`
export const SumItem = styled.div`display: flex; align-items: baseline; gap: 4px;`
export const SumLabel = styled.span`font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4};`
export const SumValue = styled.span`
  font-size: 0.78rem; font-weight: 600; color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/* ── Toggle styled components ──────────── */

export const ToggleBar = styled.div`
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
export const ToggleGroup = styled.div`
  display: flex; gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md}; padding: 2px;
`
export const ToggleBtn = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.6rem;
  padding: 2px 10px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active }) => $active ? '#fff' : 'inherit'};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  white-space: nowrap; transition: all 0.15s;
  &:hover { opacity: 0.85; }
`
export const ToggleLabel = styled.span`
  font-size: 0.55rem; color: ${({ theme }) => theme.colors.text4}; white-space: nowrap;
`

/* ── Stacked Bar styled components ─────── */

export const StackedBarSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
export const StackBarTitle = styled.div`
  font-size: 0.65rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 4px;
`
export const StackRow = styled.div<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  padding: 3px 6px 3px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
  border-left: 3px solid ${({ $active }) =>
    $active ? '#6366f1' : 'transparent'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark' ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)'
      : 'transparent'};
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark' ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.09)'
        : theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  }
`
export const ActiveBadge = styled.span`
  font-size: 0.45rem; color: #6366f1; font-weight: 700;
  margin-left: 4px; white-space: nowrap; letter-spacing: 0.02em;
`
export const StackLabel = styled.span`
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text3};
  min-width: 32px; text-align: right; white-space: nowrap;
`
export const StackTrack = styled.div`
  flex: 1; height: 32px; border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  overflow: hidden; display: flex; position: relative;
`
export const StackSegment = styled.div<{ $flex: number; $color: string }>`
  flex: ${({ $flex }) => Math.max($flex, 0)}; min-width: 0;
  background: ${({ $color }) => $color}; height: 100%;
  transition: flex 0.3s ease;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  &:hover { opacity: 0.85; z-index: 1; }
`
export const SegLabel = styled.span`
  font-size: 0.5rem; color: #fff; font-weight: 600; white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4); pointer-events: none;
  overflow: hidden; text-overflow: ellipsis; padding: 0 2px;
`
export const StackTotal = styled.span`
  font-size: 0.6rem; margin-left: 6px; white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
`
export const LegendRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;
`
export const LegendItem = styled.div<{ $clickable: boolean }>`
  display: flex; align-items: center; gap: 3px; font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text2}; cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  &:hover { opacity: ${({ $clickable }) => $clickable ? 0.7 : 1}; }
`
export const LegendDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 2px; background: ${({ $color }) => $color};
`
export const SegmentTooltip = styled.div`
  position: fixed; z-index: 9999; padding: 6px 10px; border-radius: 6px;
  font-size: 0.55rem; white-space: nowrap; pointer-events: none;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : '#fff'};
  color: ${({ theme }) => theme.colors.text}; border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
`

/* ── Tab styled components ──────────────── */

export const TabBar = styled.div`
  display: flex; gap: 0; border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
export const Tab = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.75rem; font-weight: 600;
  padding: 8px 16px; white-space: nowrap; position: relative;
  color: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.text3};
  transition: color 0.15s;
  &::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px;
    background: ${({ $active, theme }) => $active ? theme.colors.palette.primary : 'transparent'};
    transition: background 0.15s;
  }
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`

/* ── KPI mini card (compact 2nd row) ───── */

export const KpiGrid2 = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
export const KpiMini = styled.div<{ $accent?: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent ?? '#6366f1'};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
`
export const KpiMiniLabel = styled.div`
  font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4}; margin-bottom: 2px;
`
export const KpiMiniValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.85rem; font-weight: 700;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`
export const KpiMiniSub = styled.span`
  font-size: 0.55rem; color: ${({ theme }) => theme.colors.text4}; margin-left: 4px;
`

/* ── Hourly Chart styled components ────── */

export const HourlySection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
export const HourlyChartContainer = styled.div`
  display: flex; align-items: stretch; margin-bottom: 4px; padding: 0 4px;
`
export const HourlyChartWrap = styled.div`
  display: grid; height: 180px; flex: 1;
`
export const HourlyBarArea = styled.div`
  display: flex; align-items: flex-end;
  grid-row: 1; grid-column: 1; min-width: 0;
`
export const HourlyCumOverlay = styled.svg`
  grid-row: 1; grid-column: 1;
  pointer-events: none; overflow: visible;
`
export const HourlyRightAxis = styled.div`
  display: flex; flex-direction: column; justify-content: space-between;
  align-items: flex-end; width: 36px; padding: 0 2px 0 4px;
  font-size: 0.45rem; font-family: monospace;
  color: ${({ theme }) => theme.colors.text4};
`
export const HourlyBar = styled.div<{ $pct: number; $color: string }>`
  flex: 1; min-width: 0; margin: 0 1px; border-radius: 2px 2px 0 0;
  background: ${({ $color }) => $color}; opacity: 0.8;
  height: ${({ $pct }) => Math.max($pct, 1)}%;
  transition: opacity 0.15s, height 0.3s ease;
  position: relative; cursor: pointer;
  &:hover { opacity: 1; }
`
export const HourlyAxis = styled.div`
  display: flex; padding: 0 40px 0 4px;
`
export const HourlyTick = styled.div`
  flex: 1; margin: 0 1px; text-align: center; font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4}; font-family: monospace;
`
export const HourlyTooltipBox = styled.div`
  position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 4px 8px; border-radius: 4px;
  font-size: 0.55rem; white-space: nowrap;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : '#fff'};
  color: ${({ theme }) => theme.colors.text}; border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 2px 8px rgba(0,0,0,0.2); pointer-events: none;
`
export const HourlySummaryRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
export const HourlySumItem = styled.div`
  display: flex; align-items: baseline; gap: 3px; font-size: 0.65rem;
`

/* ── Hourly Detail styled components ────── */

export const HourlyDetailPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`
export const HourlyDetailHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
export const HourlyDetailTitle = styled.span`
  font-size: 0.72rem; font-weight: 600; color: ${({ theme }) => theme.colors.text};
`
export const HourlyDetailClose = styled.button`
  all: unset; cursor: pointer; font-size: 0.65rem;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.7; }
`
export const HourlyDetailSummary = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
