import styled from 'styled-components'

export const Shell = styled.div`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.layout.navWidth} ${({ theme }) =>
      theme.layout.sidebarWidth} 1fr;
  height: 100vh;
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: ${({ theme }) => theme.layout.navWidth} 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    padding-bottom: 56px; /* BottomNav の高さ分 */
  }
`

export const NavHide = styled.div`
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
`
