import styled from 'styled-components'

export const Wrapper = styled.div<{ $accent?: string; $clickable?: boolean }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: relative;
  transition:
    box-shadow ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    border-color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};
  ${({ $accent }) => $accent && `border-top: 2px solid ${$accent};`}
  ${({ $clickable, theme }) =>
    $clickable &&
    `
    cursor: pointer;
    &:hover {
      border-color: ${theme.colors.palette.primary}40;
      box-shadow: ${theme.shadows.md}, ${theme.interaction.focusRing};
      transform: ${theme.interaction.hoverLift};
    }
    &:active {
      transform: ${theme.interaction.pressScale};
      box-shadow: ${theme.shadows.sm};
    }
    &:hover [data-hint] {
      opacity: 1;
    }
    &:focus-visible {
      outline: none;
      box-shadow: ${theme.interaction.focusRing};
    }
  `}
`

export const Label = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const Value = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const SubText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[2]};
`

/** Level 1: one-line formula always visible below the value */
export const FormulaSummary = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TrendBadge = styled.span<{ $direction: 'up' | 'down' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-left: ${({ theme }) => theme.spacing[2]};
  color: ${({ $direction, theme }) =>
    $direction === 'up'
      ? theme.colors.palette.success
      : $direction === 'down'
        ? theme.colors.palette.danger
        : theme.colors.text4};
`

export const ExplainHint = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.7;
  transition: opacity 0.15s;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const MethodBadge = styled.span<{ $variant: 'actual' | 'estimated' }>`
  display: inline-flex;
  align-items: center;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: 0.02em;
  margin-left: ${({ theme }) => theme.spacing[2]};
  background: ${({ $variant, theme }) =>
    $variant === 'actual'
      ? `${theme.colors.palette.success}18`
      : `${theme.colors.palette.warningDark}18`};
  color: ${({ $variant, theme }) =>
    $variant === 'actual' ? theme.colors.palette.successDeep : theme.colors.palette.warningDeep};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'actual'
        ? `${theme.colors.palette.success}30`
        : `${theme.colors.palette.warningDark}30`};
`

/** Warning badge: severity-based coloring */
export const WarningBadge = styled.span<{
  $severity: 'info' | 'warning' | 'critical'
}>`
  display: inline-flex;
  align-items: center;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: 0.02em;
  margin-left: ${({ theme }) => theme.spacing[2]};
  background: ${({ $severity, theme }) =>
    $severity === 'critical'
      ? `${theme.colors.palette.danger}18`
      : $severity === 'warning'
        ? `${theme.colors.palette.warningDark}18`
        : `${theme.colors.palette.primary}12`};
  color: ${({ $severity, theme }) =>
    $severity === 'critical'
      ? theme.colors.palette.danger
      : $severity === 'warning'
        ? theme.colors.palette.warningDeep
        : theme.colors.palette.primary};
  border: 1px solid
    ${({ $severity, theme }) =>
      $severity === 'critical'
        ? `${theme.colors.palette.danger}30`
        : $severity === 'warning'
          ? `${theme.colors.palette.warningDark}30`
          : `${theme.colors.palette.primary}20`};
`

/** Reference value indicator (not authoritative) */
export const ReferenceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: 0.02em;
  margin-left: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => `${theme.colors.text4}12`};
  color: ${({ theme }) => theme.colors.text4};
  border: 1px solid ${({ theme }) => `${theme.colors.text4}20`};
`

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`
