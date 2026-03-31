import styled from 'styled-components'

export const Nav = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: ${({ theme }) => theme.colors.bg2};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[1]} 0;
  padding-bottom: env(safe-area-inset-bottom, 0);

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
`

export const NavItem = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  min-width: 48px;
  min-height: 48px;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  transition: color 0.15s;

  &:hover,
  &:active {
    color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const NavIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.heading};
  line-height: 1;
`

export const NavLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  line-height: 1;
  white-space: nowrap;
`
