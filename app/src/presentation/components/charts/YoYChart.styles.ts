import styled from 'styled-components'

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  flex-wrap: wrap;
`

export const SummaryItem = styled.div<{ $accent?: string }>`
  color: ${({ $accent, theme }) => $accent ?? theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
