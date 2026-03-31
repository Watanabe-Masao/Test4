import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

// ─── Main Layout ────────────────────────────────────────

export const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

export const SettingsChip = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

// ─── Settings Panel ─────────────────────────────────────

export const SettingsPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SettingsSectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  &:not(:first-child) {
    margin-top: ${({ theme }) => theme.spacing[3]};
  }
`

export const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
`

export const SettingsField = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const SettingsLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  min-width: 40px;
`

export const SettingsInput = styled.input`
  width: 60px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  &:focus {
    outline: 1px solid ${({ theme }) => theme.colors.palette.primary};
  }
`

export const SettingsUnit = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
`

export const StoreSelect = styled.select`
  width: 100%;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  &:focus {
    outline: 1px solid ${({ theme }) => theme.colors.palette.primary};
  }
`

export const StoreOverrideNote = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const MetricSettingRow = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: none;
  }
`

export const MetricSettingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const MetricToggle = styled.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
`

// ─── Card Grid ──────────────────────────────────────────

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

export const Card = styled.div<{ $borderColor: string; $clickable?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
  position: relative;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.15s;
    &:hover {
      box-shadow: 0 2px 8px ${palette.black}1A;
      transform: translateY(-1px);
    }
  `}
`

export const Signal = styled.div<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => `${$color}60`};
  flex-shrink: 0;
  margin-top: 2px;
`

export const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`

export const CardLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const CardValue = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
`

export const CardSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const ChipRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
`

export const EvidenceChip = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
  color: ${({ theme }) => theme.colors.text4};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.white};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── Overlay & Detail Panel ─────────────────────────────

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? `${palette.black}80` : `${palette.black}66`};
`

export const DetailPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  min-width: 400px;
  max-width: 720px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) =>
    `0 8px 32px ${theme.mode === 'dark' ? `${palette.black}66` : `${palette.black}33`}`};
`

export const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DetailTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const ToggleGroup = styled.div`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  transition: all 0.15s;
  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.palette.primary : theme.colors.bg4};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── Detail Table ───────────────────────────────────────

export const BTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
`

export const BTh = styled.th`
  text-align: right;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

export const BTd = styled.td<{ $color?: string; $bold?: boolean }>`
  text-align: right;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
  }
`

export const BTr = styled.tr<{ $highlight?: boolean }>`
  ${({ $highlight }) =>
    $highlight &&
    `
    font-weight: 700;
    border-top-width: 2px;
  `}
`

export const BSignalDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

export const ExpandIcon = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  margin-right: 4px;
  transition: transform 0.15s;
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0deg')});
`

export const CategoryDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
`

export const SubRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`

/** Store boundary row — thicker top border to visually separate expanded store sections */
export const StoreBorderTr = styled.tr`
  & > td {
    border-top: 3px double ${({ theme }) => theme.colors.border};
  }
`

export const BarCell = styled.div<{ $ratio: number; $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  &::after {
    content: '';
    display: inline-block;
    height: 8px;
    width: ${({ $ratio }) => Math.max(2, $ratio * 100)}%;
    max-width: 80px;
    background: ${({ $color }) => $color}40;
    border-radius: 2px;
  }
`

// ─── Simple Breakdown ───────────────────────────────────

export const BreakdownRow = styled.div<{ $bold?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

export const BreakdownLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

export const BreakdownValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const BreakdownSignal = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

export const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: block;
  width: 100%;
  text-align: center;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`
