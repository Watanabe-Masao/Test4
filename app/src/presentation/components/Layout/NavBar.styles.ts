import styled, { keyframes, css } from 'styled-components'

export const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[6]} 0;
  background: ${({ theme }) => theme.colors.bg2};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
`

export const Logo = styled.div`
  width: ${({ theme }) => theme.layout.logoSize};
  height: ${({ theme }) => theme.layout.logoSize};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.palette.primary},
    ${({ theme }) => theme.colors.palette.purpleDark}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: white;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const NavButton = styled.button<{ $active?: boolean }>`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

export const Spacer = styled.div`
  flex: 1;
`

export const ThemeButton = styled.button`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

export const StatusSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const StatusDot = styled.div<{ $color: string; $pulse?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${pulse} 1.2s ease-in-out infinite;
    `}
`

export const StatusText = styled.div<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: 600;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
`

export const StatusMeta = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
`

export const Divider = styled.div`
  width: 60%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing[1]} 0;
`

export const CustomPageBtn = styled.button<{ $active?: boolean }>`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 600;
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

export const AddPageBtn = styled.button`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text4};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) => `${theme.colors.palette.primary}10`};
  }
`

export const ContextMenu = styled.div`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)'};
  padding: ${({ theme }) => theme.spacing[1]};
  min-width: 120px;
`

export const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  all: unset;
  cursor: pointer;
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.palette.danger : theme.colors.text)};
  border-radius: ${({ theme }) => theme.radii.sm};
  box-sizing: border-box;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const RenameInput = styled.input`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  padding: 4px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  background: ${({ theme }) => theme.colors.bg};
  border: 2px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  min-width: 120px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)'};
`
