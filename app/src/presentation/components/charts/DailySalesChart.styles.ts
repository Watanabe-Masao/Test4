import styled from 'styled-components'

export const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition:
    color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
  ${({ $active, theme }) => $active && `box-shadow: 0 1px 4px ${theme.colors.palette.primary}40;`}
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const Sep = styled.span`
  display: flex;
  align-items: center;
  padding: 0 4px;
  cursor: default;
  &::after {
    content: '';
    display: block;
    width: 1px;
    height: 14px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'};
  }
`

export const GroupLabel = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  padding: 3px 0 3px 4px;
  cursor: default;
  white-space: nowrap;
`

export const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
`
