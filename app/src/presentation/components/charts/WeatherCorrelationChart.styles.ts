import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const CorrelationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const CorrelationCard = styled.div<{ $strength: 'strong' | 'moderate' | 'weak' }>`
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $strength }) =>
    $strength === 'strong'
      ? `${sc.positive}12`
      : $strength === 'moderate'
        ? `${sc.caution}12`
        : 'rgba(148,163,184,0.08)'};
  border: 1px solid
    ${({ $strength }) =>
      $strength === 'strong'
        ? `${sc.positive}30`
        : $strength === 'moderate'
          ? `${sc.caution}30`
          : 'rgba(148,163,184,0.15)'};
`

export const CorrelationLabel = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 2px;
`

export const CorrelationValue = styled.div<{ $strength: 'strong' | 'moderate' | 'weak' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $strength }) =>
    $strength === 'strong' ? sc.positive : $strength === 'moderate' ? sc.caution : '#94a3b8'};
`

export const ChartContainer = styled.div`
  height: 320px;
  margin-top: ${({ theme }) => theme.spacing[2]};
`

export const NoDataMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`
