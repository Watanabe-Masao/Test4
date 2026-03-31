import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

export const PanelOverlay = styled.div<{ $collapsed: boolean }>`
  position: fixed;
  bottom: 0;
  right: 0;
  width: ${(p) => (p.$collapsed ? '200px' : '600px')};
  max-height: ${(p) => (p.$collapsed ? '40px' : '400px')};
  background: ${(p) => p.theme.colors.bg};
  border-top: 2px solid ${(p) => p.theme.colors.palette.info};
  border-left: 2px solid ${(p) => p.theme.colors.palette.info};
  border-radius: 8px 0 0 0;
  z-index: ${(p) => p.theme.zIndex.tooltip + 100};
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${(p) => p.theme.colors.text};
  overflow: hidden;
  transition: all 0.2s ease;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: ${(p) => p.theme.colors.bg2};
  cursor: pointer;
  user-select: none;
`

export const Title = styled.span`
  font-weight: 600;
  letter-spacing: 0.5px;
`

export const Stats = styled.span`
  opacity: 0.7;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const ClearButton = styled.button`
  background: transparent;
  border: 1px solid ${palette.white}33;
  color: inherit;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  &:hover {
    background: ${palette.white}1A;
  }
`

export const EntryList = styled.div`
  overflow-y: auto;
  max-height: 350px;
  padding: 4px;
`

export const EntryRow = styled.div<{ $status: string }>`
  display: grid;
  grid-template-columns: 50px 1fr 60px 50px;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid ${palette.white}0D;
  align-items: center;
  background: ${(p) =>
    p.$status === 'error'
      ? `${palette.dangerDark}1A`
      : p.$status === 'running'
        ? `${palette.warningDark}1A`
        : 'transparent'};

  &:hover {
    background: ${palette.white}0D;
  }
`

export const SqlText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
`

export const Duration = styled.span<{ $slow: boolean }>`
  text-align: right;
  color: ${(p) => (p.$slow ? '#ff6b6b' : '#7bed9f')};
  font-weight: ${(p) => (p.$slow ? 600 : 400)};
`

export const StatusBadge = styled.span<{ $status: string }>`
  text-align: center;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: 600;
  text-transform: uppercase;
  background: ${(p) =>
    p.$status === 'success'
      ? `${palette.successDark}33`
      : p.$status === 'error'
        ? `${palette.danger}33`
        : `${palette.warningDark}33`};
  color: ${(p) =>
    p.$status === 'success' ? '#7bed9f' : p.$status === 'error' ? '#ff6b6b' : '#ffc832'};
`
