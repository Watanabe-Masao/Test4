import type { ReactNode } from 'react'
import { Shell, NavHide } from './AppShell.styles'

export function AppShell({
  nav,
  sidebar,
  children,
  bottomNav,
}: {
  nav: ReactNode
  sidebar: ReactNode
  children: ReactNode
  bottomNav?: ReactNode
}) {
  return (
    <Shell>
      <NavHide>{nav}</NavHide>
      {sidebar}
      {children}
      {bottomNav}
    </Shell>
  )
}
