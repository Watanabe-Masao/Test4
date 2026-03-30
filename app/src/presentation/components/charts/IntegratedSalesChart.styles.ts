import styled from 'styled-components'

export const Wrapper = styled.div`
  position: relative;
`

export const DrillNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const NavItem = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.palette.primary)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)'
      : 'transparent'};
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const NavSep = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const DrillHint = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  opacity: 0.7;
`

export const RangeActionBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)'};
  border: 1px solid ${({ theme }) => theme.colors.palette.primary}40;
  border-radius: ${({ theme }) => theme.radii.md};
`

export const RangeActionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const RangeActionBtnGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-left: auto;
`

export const RangeActionBtn = styled.button<{ $secondary?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $secondary, theme }) =>
    $secondary ? theme.colors.bg4 : theme.colors.palette.primary};
  color: ${({ $secondary, theme }) =>
    $secondary ? theme.colors.text3 : theme.colors.palette.white};
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
`

export const DrillPeriodBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => `${theme.colors.palette.primary}14`};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const DayDrillClose = styled.button`
  all: unset;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  margin-left: ${({ theme }) => theme.spacing[2]};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`
