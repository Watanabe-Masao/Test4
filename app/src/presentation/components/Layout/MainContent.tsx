import styled from 'styled-components'
import type { ReactNode } from 'react'

const Main = styled.main`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.bg};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const StoreBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => theme.colors.palette.primary}15;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.pill};
  margin-left: ${({ theme }) => theme.spacing[4]};
`

export function MainContent({
  title,
  storeName,
  actions,
  children,
}: {
  title: string
  storeName?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Main>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title>{title}</Title>
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </div>
        {actions}
      </Header>
      {children}
    </Main>
  )
}
