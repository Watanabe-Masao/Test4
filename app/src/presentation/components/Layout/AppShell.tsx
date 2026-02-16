import styled from 'styled-components'
import type { ReactNode } from 'react'

const Shell = styled.div`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.layout.navWidth} ${({ theme }) => theme.layout.sidebarWidth} 1fr;
  height: 100vh;
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: ${({ theme }) => theme.layout.navWidth} 1fr;
  }
`

export function AppShell({ nav, sidebar, children }: {
  nav: ReactNode
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <Shell>
      {nav}
      {sidebar}
      {children}
    </Shell>
  )
}
