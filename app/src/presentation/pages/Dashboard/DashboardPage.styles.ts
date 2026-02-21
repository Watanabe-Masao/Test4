import styled from 'styled-components'
import { DataTableWrapper, DataTableTitle, DataTable, DataTh, DataTd } from '@/presentation/components/common'

// ─── Executive Dashboard Styled Components ──────────────

export const ExecSummaryBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ExecSummaryItem = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
`

export const ExecSummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const ExecSummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const ExecSummarySub = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const ExecSummaryWrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

export const ExecSummaryTabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
`

export const ExecSummaryTab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active, theme }) => $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
  color: ${({ $active, theme }) => $active ? theme.colors.text : theme.colors.text3};
  border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { color: ${({ theme }) => theme.colors.text2}; }
`

export const ExecSummaryTabContent = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`

export const ExecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const ExecColumn = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

export const ExecColHeader = styled.div<{ $color: string }>`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ $color }) => $color};
`

export const ExecColTag = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text3};
`

export const ExecColTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const ExecColSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

export const ExecBody = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ExecRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ExecLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  flex-shrink: 0;
`

export const ExecVal = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
`

export const ExecSub = styled.div<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
  text-align: right;
`

export const ExecDividerLine = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0;
`

export const InventoryBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

// ─── Range Selection Styled Components ───────────────────

export const RangeToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  flex-wrap: wrap;
`

export const RangeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
`

export const RangeInput = styled.input`
  width: 56px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.palette.warning}; }
`

export const RangeSummaryPanel = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

export const RangeSummaryTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const RangeSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

export const RangeSummaryItem = styled.div``

export const RangeSummaryItemLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const RangeSummaryItemValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

/* ── 3-Column Compare Layout ── */

export const RangeCompareContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
`

export const RangeColumn = styled.div<{ $accent?: string }>`
  padding: ${({ theme }) => theme.spacing[6]};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
`

export const RangeColumnHeader = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  border-bottom: 2px solid ${({ $color }) => $color ?? '#6366f1'};
`

export const RangeColumnDot = styled.div<{ $color?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color ?? '#6366f1'};
  flex-shrink: 0;
`

export const RangeColumnTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const RangeMetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};
  }
`

export const RangeMetricLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

export const RangeMetricValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

/* ── Center comparison column ── */

export const RangeCenterCol = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  min-width: 280px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`

export const RangeCenterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  border-bottom: 2px solid ${({ theme }) => theme.colors.text3};
`

export const CompareBarRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const CompareBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const CompareBarDiff = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color ?? '#9ca3af'};
`

export const CompareBarTrack = styled.div`
  display: flex;
  height: 22px;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`

export const CompareBarSegment = styled.div<{ $width: string; $color: string; $align?: string }>`
  width: ${({ $width }) => $width};
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => $align ?? 'center'};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.6rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: #fff;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
  transition: width 0.3s ease;
`

export const CompareIndicator = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ $color, theme }) =>
    $color ? `${$color}18` : theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const CompareIndicatorValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color ?? '#9ca3af'};
`

export const CompareIndicatorLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

// ─── Calendar Styled Components ─────────────────────────

export const CalWrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[8]};
  overflow-x: auto;
`

export const CalSectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const CalTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  table-layout: fixed;
`

export const CalTh = styled.th<{ $weekend?: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[2]}`};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $weekend, theme }) => $weekend ? theme.colors.palette.danger : theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  width: calc(100% / 7);
`

export const CalTd = styled.td<{ $empty?: boolean; $hasActual?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: top;
  height: 150px;
  ${({ $empty, theme }) => $empty ? `background: ${theme.colors.bg2};` : ''}
  ${({ $hasActual, $empty, theme }) => !$empty && $hasActual === false ? `
    background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
    opacity: 0.7;
  ` : ''}
  ${({ $hasActual, $empty, theme }) => !$empty && $hasActual ? `
    background: ${theme.mode === 'dark' ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)'};
  ` : ''}
`

export const CalDayNum = styled.div<{ $weekend?: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ $weekend, theme }) => $weekend ? theme.colors.palette.danger : theme.colors.text};
  margin-bottom: 2px;
`

export const CalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0px 2px;
`

export const CalCell = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.58rem;
  color: ${({ $color, theme }) => $color ?? theme.colors.text2};
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CalDivider = styled.div`
  grid-column: 1 / -1;
  border-top: 1px dashed ${({ theme }) => theme.colors.border};
  margin: 1px 0;
`

// ─── Pin & Interval Styled Components ───────────────────

export const CalDayCell = styled.div<{ $pinned?: boolean; $inInterval?: boolean; $rangeColor?: string }>`
  position: relative;
  height: 100%;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: background 0.15s;
  ${({ $rangeColor, theme }) => $rangeColor ? `
    background: ${theme.mode === 'dark' ? `${$rangeColor}30` : `${$rangeColor}1a`};
    outline: 2px solid ${$rangeColor};
    outline-offset: -2px;
  ` : ''}
  ${({ $pinned, $rangeColor, theme }) => $pinned && !$rangeColor ? `
    background: ${theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.10)'};
  ` : ''}
  ${({ $inInterval, $pinned, $rangeColor, theme }) => $inInterval && !$pinned && !$rangeColor ? `
    background: ${theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)'};
  ` : ''}
`

export const CalDayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1px;
`

export const CalActionBtn = styled.button<{ $color?: string }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 1px 3px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
  opacity: 0.5;
  transition: opacity 0.15s, background 0.15s;
  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
  }
`

export const CalDataArea = styled.div`
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
`

export const PinIndicator = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-top: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.10)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px 3px;
  text-align: center;
`

export const IntervalSummary = styled.div`
  margin-top: ${({ theme }) => theme.spacing[8]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`

export const IntervalCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $color }) => $color ?? '#6366f1'};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[8]}`};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

export const IntervalMetricLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const IntervalMetricValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const PinModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const PinModalContent = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => `${theme.spacing[10]} ${theme.spacing[10]}`};
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

export const PinModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const PinInputField = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  background: ${({ theme }) => theme.colors.bg3};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.palette.primary}; }
`

export const PinButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[8]};
`

export const PinInputLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

// ─── Detail Modal Styled Components ─────────────────────

export const DetailModalContent = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  min-width: 800px;
  max-width: 95vw;
  width: 960px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DetailTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const DetailCloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

export const DetailKpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DetailKpiCard = styled.div<{ $accent?: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ $accent }) => $accent ?? '#6366f1'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[4]}`};
  text-align: center;
`

export const DetailKpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const DetailKpiValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const DetailSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DetailSectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};
`

export const DetailLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
`

export const DetailValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const DetailBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const DetailBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const DetailBarLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  width: 40px;
  text-align: right;
  flex-shrink: 0;
`

export const DetailBarTrack = styled.div`
  flex: 1;
  height: 20px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  position: relative;
`

export const DetailBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => Math.min($width, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
`

export const DetailBarAmount = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  white-space: nowrap;
`

export const DetailChartWrapper = styled.div`
  height: 200px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DetailColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
`

// ─── Forecast Tools Styled Components ───────────────────

export const ForecastToolsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[8]};
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`

export const ToolCard = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[8]};
`

export const ToolCardTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const ToolInputGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const ToolInputField = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  background: ${({ theme }) => theme.colors.bg2};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.palette.primary}; }
`

export const ToolInputSub = styled.div<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  text-align: right;
`

export const ToolResultSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[8]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ToolResultValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const ToolResultLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
`

// ─── Summary Table Styled Components ────────────────────
// DataTable ベースに Dashboard 固有のスタイルを上書き

export const STableWrapper = styled(DataTableWrapper)`
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const STableTitle = DataTableTitle

export const STable = styled(DataTable)`
  font-family: inherit;
`

export const STh = styled(DataTh)`
  padding: ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  &:first-child { text-align: left; }
`

export const STd = styled(DataTd)`
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text2};
  &:first-child {
    text-align: left;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── Layout Styled Components ───────────────────────────

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

export const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

export const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => $isDragging ? 0.4 : 1};
  ${({ $isOver, theme }) => $isOver ? `
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed ${theme.colors.palette.primary};
      border-radius: ${theme.radii.lg};
      pointer-events: none;
      z-index: 1;
    }
  ` : ''}
  cursor: grab;
  &:active { cursor: grabbing; }
`

export const DragHandle = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & { opacity: 1; }
`

// ─── Settings Panel ──────────────────────────────────────

export const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
`

export const Panel = styled.div`
  width: 340px;
  max-width: 90vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
`

export const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const WidgetItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

export type WidgetSize = 'kpi' | 'half' | 'full'

export const SizeBadge = styled.span<{ $size: WidgetSize }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $size, theme }) =>
    $size === 'kpi' ? `${theme.colors.palette.primary}20`
    : $size === 'half' ? `${theme.colors.palette.success}20`
    : `${theme.colors.palette.warning}20`};
  color: ${({ $size, theme }) =>
    $size === 'kpi' ? theme.colors.palette.primary
    : $size === 'half' ? theme.colors.palette.success
    : theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const PanelFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`
