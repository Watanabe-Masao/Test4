import styled from 'styled-components'

export const Main = styled.main`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.bg};
`

export const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -${({ theme }) => theme.spacing[8]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.bg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const Badge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
`

export const MonthBadgeButton = styled.button`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid transparent;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary}60;
    background: ${({ theme }) => theme.colors.palette.primary}10;
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const StoreBadge = styled(Badge)`
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => theme.colors.palette.primary}15;
`

export const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: inline-block;
`

export const ContextBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

// ── Month Picker Popup ──

export const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
`

export const PickerDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 201;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: ${({ theme }) => theme.spacing[4]};
  min-width: 220px;
`

export const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const YearLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const YearArrow = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: 12px;
  touch-action: manipulation;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

export const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[1]};
`

export const MonthCell = styled.button<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  touch-action: manipulation;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const BadgeWrapper = styled.div`
  position: relative;
  display: inline-block;
`

export const PeriodInfo = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
`

