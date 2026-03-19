import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const CorrelationRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

export const CorrBadge = styled.div<{ $strength: 'strong' | 'moderate' | 'weak' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: ${({ theme }) => theme.spacing[0]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ $strength }) =>
    $strength === 'strong'
      ? `${sc.positive}1f`
      : $strength === 'moderate'
        ? `${sc.caution}1f`
        : `${sc.neutral}1f`};
  color: ${({ $strength }) =>
    $strength === 'strong' ? sc.positive : $strength === 'moderate' ? sc.caution : sc.neutral};
  border: 1px solid
    ${({ $strength }) =>
      $strength === 'strong'
        ? `${sc.positive}40`
        : $strength === 'moderate'
          ? `${sc.caution}40`
          : `${sc.neutral}40`};
  white-space: nowrap;
`
