import styled from 'styled-components'
import type { ReactNode } from 'react'

const SidebarWrapper = styled.aside`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg2};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[6]};
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`

const SidebarTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export function Sidebar({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SidebarWrapper>
      <SidebarTitle>{title}</SidebarTitle>
      {children}
    </SidebarWrapper>
  )
}
