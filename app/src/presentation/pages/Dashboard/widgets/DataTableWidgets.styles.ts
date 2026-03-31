import styled from 'styled-components'
import { STh, STd } from '../DashboardPage.styles'

export const GroupTh = styled(STh)`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const SubTh = styled(STh)`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  white-space: nowrap;
`

export const SummaryRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  font-weight: 600;
`

export const StickyTd = styled(STd)`
  position: sticky;
  left: 0;
  z-index: 1;
  background: inherit;
`

export const InvTd = styled(STd)<{ $neg?: boolean }>`
  color: ${({ $neg, theme }) => ($neg ? theme.colors.palette.danger : theme.colors.text2)};
`
