import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const Wrapper = styled.div`
  width: 100%;
  height: 420px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const InfoRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

export const InfoBadge = styled.div<{ $color: string }>`
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}30;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

export const TrendBadge = styled.div<{ $trend: 'up' | 'down' | 'flat' }>`
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $trend }) =>
    $trend === 'up'
      ? 'rgba(14,165,233,0.12)'
      : $trend === 'down'
        ? 'rgba(249,115,22,0.12)'
        : 'rgba(148,163,184,0.12)'};
  color: ${({ $trend }) =>
    $trend === 'up' ? sc.positive : $trend === 'down' ? sc.negative : '#94a3b8'};
  border: 1px solid
    ${({ $trend }) =>
      $trend === 'up'
        ? 'rgba(14,165,233,0.25)'
        : $trend === 'down'
          ? 'rgba(249,115,22,0.25)'
          : 'rgba(148,163,184,0.25)'};
  white-space: nowrap;
`
