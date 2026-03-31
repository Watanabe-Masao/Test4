import styled from 'styled-components'

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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
`

export const RangeInput = styled.input`
  width: 56px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.warning};
  }
`

export const RangeSummaryPanel = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

export const RangeSummaryTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const RangeSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

export const RangeSummaryItem = styled.div``

export const RangeSummaryItemLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const RangeSummaryItemValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
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
  &:last-child {
    border-right: none;
  }
`

export const RangeColumnHeader = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  border-bottom: 2px solid ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
`

export const RangeColumnDot = styled.div<{ $color?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
  flex-shrink: 0;
`

export const RangeColumnTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const RangeMetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  &:not(:last-child) {
    border-bottom: 1px solid
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')};
  }
`

export const RangeMetricLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

export const RangeMetricValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

/* ── Center comparison column ── */

export const RangeCenterCol = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
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
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const CompareBarDiff = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
`

export const CompareBarTrack = styled.div`
  display: flex;
  height: 22px;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`

export const CompareBarSegment = styled.div<{ $width: string; $color: string; $align?: string }>`
  width: ${({ $width }) => $width};
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => $align ?? 'center'};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.palette.white};
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
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
`

export const CompareIndicatorLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`
