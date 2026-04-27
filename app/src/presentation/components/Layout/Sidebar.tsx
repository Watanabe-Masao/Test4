/**
 * @responsibility R:unclassified
 */

import type { ReactNode } from 'react'
import { SidebarWrapper, SidebarTitle } from './Sidebar.styles'

export function Sidebar({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SidebarWrapper>
      <SidebarTitle>{title}</SidebarTitle>
      {children}
    </SidebarWrapper>
  )
}
