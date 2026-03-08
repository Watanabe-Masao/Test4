import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const SparkRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 90px 60px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}40;
  &:last-child {
    border-bottom: none;
  }
`

export const MetricLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SparkContainer = styled.div`
  height: 32px;
  width: 100%;
  position: relative;
`

export const CurrentValue = styled.div`
  font-size: 0.7rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  white-space: nowrap;
`

export const Badge = styled.div<{ $positive: boolean }>`
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: 1px 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  text-align: center;
  white-space: nowrap;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.palette.success : theme.colors.palette.danger};
  background: ${({ $positive, theme }) =>
    $positive
      ? theme.mode === 'dark'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(34,197,94,0.08)'
      : theme.mode === 'dark'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(239,68,68,0.08)'};
`
