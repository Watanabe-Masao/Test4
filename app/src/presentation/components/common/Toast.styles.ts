import styled, { keyframes, css } from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import type { ToastLevel } from './toastContextDef'

// ─── アニメーション ───────────────────────────────────
const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const slideOut = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
`

// ─── レベル色マップ ──────────────────────────────────
export const levelColors: Record<ToastLevel, string> = {
  success: sc.positive,
  error: sc.negative,
  warning: sc.caution,
  info: palette.infoDark,
}

// ─── スタイル ─────────────────────────────────────────
export const Container = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[8]};
  right: ${({ theme }) => theme.spacing[8]};
  z-index: 3000;
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing[3]};
  pointer-events: none;
`

export const ToastCard = styled.div<{ $level: ToastLevel; $dismissing: boolean }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $level }) => levelColors[$level]};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  min-width: 280px;
  max-width: 420px;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  pointer-events: auto;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)'};
  ${({ $dismissing }) =>
    $dismissing
      ? css`
          animation: ${slideOut} 0.25s ease forwards;
        `
      : css`
          animation: ${slideIn} 0.3s ease;
        `}
`

export const IconBadge = styled.span<{ $level: ToastLevel }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $level }) => levelColors[$level]}22;
  color: ${({ $level }) => levelColors[$level]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 700;
  line-height: 1;
`

export const MessageText = styled.span`
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
`

export const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text2};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── 通知履歴パネル ──────────────────────────────────
export const HistoryToggle = styled.button<{ $hasUnread: boolean }>`
  all: unset;
  cursor: pointer;
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[8]};
  right: calc(${({ theme }) => theme.spacing[8]} + 440px);
  z-index: 3001;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  color: ${({ theme }) => theme.colors.text3};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.12)'};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  ${({ $hasUnread }) =>
    $hasUnread &&
    css`
      &::after {
        content: '';
        position: absolute;
        top: 6px;
        right: 6px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${sc.negative};
      }
    `}
`

export const HistoryPanel = styled.div`
  position: fixed;
  bottom: calc(${({ theme }) => theme.spacing[8]} + 44px);
  right: ${({ theme }) => theme.spacing[8]};
  z-index: 3002;
  width: 380px;
  max-height: 400px;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.2)'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const HistoryClear = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  &:hover {
    color: ${({ theme }) => theme.colors.text2};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
`

export const HistoryEntry = styled.div<{ $level: ToastLevel }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  border-left: 2px solid ${({ $level }) => levelColors[$level]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
  }
`

export const HistoryTime = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
  margin-top: 1px;
`

export const HistoryMsg = styled.span`
  flex: 1;
  line-height: 1.4;
`

export const EmptyHistory = styled.div`
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`
