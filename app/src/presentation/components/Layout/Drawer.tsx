/**
 * Phase 3.5: モバイルドロワーコンポーネント
 *
 * タブレット/スマートフォンでサイドバーをオーバーレイ表示する。
 * デスクトップでは非表示、md以下でハンバーガーメニューから開く。
 */
import styled, { css, keyframes } from 'styled-components'
import { useEffect, type ReactNode } from 'react'

const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`

const slideOut = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
`

const Overlay = styled.div<{ $open: boolean }>`
  display: none;
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: opacity 0.2s;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: block;
  }
`

const DrawerPanel = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
  z-index: 101;
  background: ${({ theme }) => theme.colors.bg2};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[6]};
  display: none;

  ${({ $open }) =>
    $open
      ? css`animation: ${slideIn} 0.2s ease-out forwards;`
      : css`animation: ${slideOut} 0.2s ease-in forwards;`}

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[4]};
  }
`

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DrawerTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const CloseButton = styled.button`
  all: unset;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  // Escape キーで閉じる
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ドロワーが開いている間、body スクロールを防止
  // 元の overflow 値を保持し、閉じた際に復元する
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <Overlay $open={open} onClick={onClose} />
      <DrawerPanel $open={open}>
        <DrawerHeader>
          {title && <DrawerTitle>{title}</DrawerTitle>}
          <CloseButton onClick={onClose} aria-label="閉じる">
            &times;
          </CloseButton>
        </DrawerHeader>
        {children}
      </DrawerPanel>
    </>
  )
}
