import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import type { AlertSeverity } from '@/application/hooks/useAlerts'

export const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

export const BadgeCount = styled.span<{ $severity: AlertSeverity }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $severity }) =>
    $severity === 'critical'
      ? palette.dangerDark
      : $severity === 'warning'
        ? palette.caution
        : palette.blueDark};
  color: ${({ $severity, theme }) =>
    $severity === 'warning' ? theme.colors.text : theme.colors.palette.white};
`

export const AlertList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  max-height: 400px;
  overflow-y: auto;
`

export const AlertCard = styled.div<{ $severity: AlertSeverity; $clickable: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid
    ${({ $severity }) =>
      $severity === 'critical'
        ? palette.dangerDark
        : $severity === 'warning'
          ? palette.caution
          : palette.blueDark};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  ${({ $clickable, theme }) =>
    $clickable &&
    `
    &:hover {
      border-color: ${theme.colors.palette.primary};
      box-shadow: 0 0 0 1px ${theme.colors.palette.primary}40;
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.palette.primary};
      outline-offset: 2px;
    }
  `}
`

export const SeverityIcon = styled.div<{ $severity: AlertSeverity }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: bold;
  background: ${({ $severity }) =>
    $severity === 'critical'
      ? `${palette.dangerDark}20`
      : $severity === 'warning'
        ? `${palette.caution}20`
        : `${palette.blueDark}20`};
  color: ${({ $severity }) =>
    $severity === 'critical'
      ? palette.dangerDark
      : $severity === 'warning'
        ? palette.caution
        : palette.blueDark};
`

export const AlertBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const AlertMessage = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.4;
`

export const AlertDetail = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

export const DetailItem = styled.span`
  white-space: nowrap;
`

export const AlertFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing[2]};
`

export const ExplainLink = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  white-space: nowrap;
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`
