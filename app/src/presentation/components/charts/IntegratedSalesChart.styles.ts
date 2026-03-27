import styled from 'styled-components'

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
