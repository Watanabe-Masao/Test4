import styled from 'styled-components'
import type { ProductType } from '@/application/hooks/duckdb'
import { palette } from '@/presentation/theme/tokens'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Subtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

export const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

export const ControlGroup = styled.div<{ $hidden?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
  pointer-events: ${({ $hidden }) => ($hidden ? 'none' : 'auto')};
`

export const ControlLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

export const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? `${palette.primary}33`
        : `${palette.primary}14`
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const Th = styled.th`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

export const Td = styled.td<{ $color?: string; $bold?: boolean; $align?: string }>`
  text-align: ${({ $align }) => $align ?? 'center'};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    font-size: ${({ theme }) => theme.typography.fontSize.micro};
  }
`

export const TypeBadge = styled.span<{ $type: ProductType }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: 600;
  background: ${({ $type, theme }) => {
    const alpha = theme.mode === 'dark' ? '0.2' : '0.1'
    switch ($type) {
      case 'flagship':
        return `${palette.successDark}${Math.round(Number(alpha) * 255)
          .toString(16)
          .padStart(2, '0')}`
      case 'regional':
        return `${palette.blueDark}${Math.round(Number(alpha) * 255)
          .toString(16)
          .padStart(2, '0')}`
      case 'standard':
        return `${palette.slate}${Math.round(Number(alpha) * 255)
          .toString(16)
          .padStart(2, '0')}`
      case 'unstable':
        return `${palette.dangerDark}${Math.round(Number(alpha) * 255)
          .toString(16)
          .padStart(2, '0')}`
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'flagship':
        return '#22c55e'
      case 'regional':
        return '#3b82f6'
      case 'standard':
        return '#9ca3af'
      case 'unstable':
        return '#ef4444'
    }
  }};
`

export const MapSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
`

export const MapLegend = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
`

export const LegendItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

export const MapQuadrantLabel = styled.div`
  position: absolute;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  pointer-events: none;
`

export const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

export const KpiCard = styled.div<{ $accent: string }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const KpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
`

export const KpiValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

export const KpiSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

export const FilterSelect = styled.select`
  padding: 2px 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff')};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  max-width: 140px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`
