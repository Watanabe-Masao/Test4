import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

// ─── Detail Modal Styled Components ─────────────────────

export const DetailModalContent = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  min-width: 600px;
  max-width: 90vw;
  width: 960px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => `0 20px 60px ${theme.mode === 'dark' ? `${palette.black}80` : `${palette.black}4D`}`};
`

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DetailTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const DetailCloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
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
  border-top: 2px solid ${({ $accent, theme }) => $accent ?? theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[4]}`};
  text-align: center;
`

export const DetailKpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const DetailKpiValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const DetailSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DetailSectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
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
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')};
`

export const DetailLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`

export const DetailValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: white;
  text-shadow: 0 1px 2px ${palette.black}66;
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
