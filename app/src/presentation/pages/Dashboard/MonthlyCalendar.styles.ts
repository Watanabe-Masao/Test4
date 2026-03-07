import styled from 'styled-components'

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
  color: ${({ $weekend, theme }) => ($weekend ? theme.colors.palette.danger : theme.colors.text3)};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  width: calc(100% / 7);
`

export const CalTd = styled.td<{ $empty?: boolean; $hasActual?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: top;
  height: 96px;
  ${({ $empty, theme }) => ($empty ? `background: ${theme.colors.bg2};` : '')}
  ${({ $hasActual, $empty, theme }) =>
    !$empty && $hasActual === false
      ? `
    background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
    opacity: 0.7;
  `
      : ''}
  ${({ $hasActual, $empty, theme }) =>
    !$empty && $hasActual
      ? `
    background: ${`${theme.colors.palette.success}${theme.mode === 'dark' ? '0a' : '08'}`};
  `
      : ''}
`

export const CalDayNum = styled.div<{ $weekend?: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ $weekend, theme }) => ($weekend ? theme.colors.palette.danger : theme.colors.text)};
  margin-bottom: 2px;
`

export const CalGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const CalCell = styled.div<{ $color?: string; $bold?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $bold, theme }) => ($bold ? theme.typography.fontWeight.bold : 'normal')};
  color: ${({ $color, theme }) => $color ?? theme.colors.text2};
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CalHeroValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.3;
  margin-bottom: 1px;
`

export const CalAchBar = styled.div<{ $pct: number }>`
  height: 3px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.bg4};
  margin: 2px 0;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ $pct }) => Math.min($pct * 100, 100)}%;
    border-radius: 2px;
    background: ${({ $pct, theme }) =>
      $pct >= 1
        ? theme.colors.palette.success
        : $pct >= 0.9
          ? theme.colors.palette.warning
          : theme.colors.palette.danger};
    ${({ $pct }) =>
      $pct > 1
        ? `background-image: repeating-linear-gradient(
        -45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px);`
        : ''}
  }
`

export const CalMetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`

export const CalDivider = styled.div`
  border-top: 1px dashed ${({ theme }) => theme.colors.border};
  margin: 1px 0;
`

// ─── Pin & Interval Styled Components ───────────────────

export const CalDayCell = styled.div<{
  $pinned?: boolean
  $inInterval?: boolean
  $rangeColor?: string
  /** 'A' = dashed outline, 'B' = solid outline */
  $rangeType?: 'A' | 'B'
}>`
  position: relative;
  height: 100%;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: background 0.15s;
  ${({ $rangeColor, $rangeType, theme }) =>
    $rangeColor
      ? `
    background: ${theme.mode === 'dark' ? `${$rangeColor}30` : `${$rangeColor}1a`};
    outline: 2px ${$rangeType === 'A' ? 'dashed' : 'solid'} ${$rangeColor};
    outline-offset: -2px;
  `
      : ''}
  ${({ $pinned, $rangeColor, theme }) =>
    $pinned && !$rangeColor
      ? `
    background: ${`${theme.colors.palette.primary}${theme.mode === 'dark' ? '2e' : '1a'}`};
  `
      : ''}
  ${({ $inInterval, $pinned, $rangeColor, theme }) =>
    $inInterval && !$pinned && !$rangeColor
      ? `
    background: ${`${theme.colors.palette.primary}${theme.mode === 'dark' ? '0f' : '0a'}`};
  `
      : ''}
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
  transition:
    opacity 0.15s,
    background 0.15s;
  &:hover {
    opacity: 1;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
  }
  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`

export const CalDataArea = styled.div`
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
`

export const PinIndicator = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-top: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) =>
    `${theme.colors.palette.primary}${theme.mode === 'dark' ? '26' : '1a'}`};
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
  border-left: 4px solid ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
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
  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
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
