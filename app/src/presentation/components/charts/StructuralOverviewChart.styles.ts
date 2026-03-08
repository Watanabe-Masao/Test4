import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const FlowContainer = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  min-height: 220px;
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  flex: 1;
  min-width: 0;
`

export const ColumnLabel = styled.div`
  font-size: 0.55rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text4};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const FlowNode = styled.div<{
  $color: string
  $height: number
  $clickable?: boolean
  $active?: boolean
}>`
  background: ${({ $color, $active }) => ($active ? `${$color}28` : `${$color}18`)};
  border: 1px solid ${({ $color, $active }) => ($active ? $color : `${$color}40`)};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  min-height: ${({ $height }) => Math.max($height, 36)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: all 0.15s;
  &:hover {
    ${({ $clickable, $color }) => ($clickable ? `border-color: ${$color};` : '')}
  }
`

export const NodeLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const NodeValue = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const NodeSub = styled.div`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const YoyBadge = styled.span<{ $positive: boolean }>`
  display: inline-block;
  font-size: 0.45rem;
  font-weight: 600;
  padding: 0 3px;
  border-radius: 2px;
  margin-left: 4px;
  color: ${({ $positive }) => sc.cond($positive)};
  background: ${({ $positive }) => ($positive ? 'rgba(14,165,233,0.1)' : 'rgba(249,115,22,0.1)')};
`

export const Arrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text4};
  font-size: 0.8rem;
`

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`

export const SumCard = styled.div<{ $color: string }>`
  flex: 1;
  min-width: 120px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

export const SumLabel = styled.div`
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

export const SumValue = styled.div`
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

// ── ドリルダウンパネル ──

export const DrillPanel = styled.div<{ $color: string }>`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const DrillHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const DrillTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

export const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

export const DrillGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 3px;
`

export const DrillDay = styled.div<{ $intensity: number; $color: string }>`
  padding: 3px 2px;
  text-align: center;
  border-radius: 3px;
  font-size: 0.55rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ $color, $intensity }) =>
    `${$color}${Math.round($intensity * 40)
      .toString(16)
      .padStart(2, '0')}`};
  color: ${({ theme }) => theme.colors.text};
  position: relative;
`

export const DrillDayLabel = styled.div`
  font-size: 0.45rem;
  color: ${({ theme }) => theme.colors.text4};
`

export const DrillDayValue = styled.div`
  font-weight: 600;
  font-size: 0.55rem;
`

export const DrillSummary = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px dashed ${({ theme }) => theme.colors.border};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text3};
  flex-wrap: wrap;
`

export const DrillStat = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`
