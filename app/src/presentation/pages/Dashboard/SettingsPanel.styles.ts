/**
 * Dashboard — 設定パネルスタイル
 *
 * ウィジェット設定パネルのシェル（オーバーレイ、パネル本体、チェックボックス等）。
 */
import styled from 'styled-components'

export const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  display: flex;
  justify-content: flex-end;
`

export const Panel = styled.div`
  width: 340px;
  max-width: 90vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
`

export const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const PanelGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const WidgetItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

export type WidgetSize = 'kpi' | 'half' | 'full'

export const SizeBadge = styled.span<{ $size: WidgetSize }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $size, theme }) =>
    $size === 'kpi'
      ? `${theme.colors.palette.primary}20`
      : $size === 'half'
        ? `${theme.colors.palette.success}20`
        : `${theme.colors.palette.warning}20`};
  color: ${({ $size, theme }) =>
    $size === 'kpi'
      ? theme.colors.palette.primary
      : $size === 'half'
        ? theme.colors.palette.success
        : theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const PanelFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`
