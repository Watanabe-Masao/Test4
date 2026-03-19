import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const InfoRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

export const InfoBadge = styled.div<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: ${({ theme }) => theme.spacing[0]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}30;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

export const TrendBadge = styled.div<{ $trend: 'up' | 'down' | 'stable' | 'flat' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: ${({ theme }) => theme.spacing[0]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $trend }) =>
    $trend === 'up'
      ? `${sc.positive}1f`
      : $trend === 'down'
        ? `${sc.negative}1f`
        : `${sc.neutral}1f`};
  color: ${({ $trend }) =>
    $trend === 'up' ? sc.positive : $trend === 'down' ? sc.negative : sc.neutral};
  border: 1px solid
    ${({ $trend }) =>
      $trend === 'up'
        ? `${sc.positive}40`
        : $trend === 'down'
          ? `${sc.negative}40`
          : `${sc.neutral}40`};
  white-space: nowrap;
`
