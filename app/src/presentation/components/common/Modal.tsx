import styled from 'styled-components'
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Container = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  max-width: 480px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const Body = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[8]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

export function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  const titleId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Focus trap: keep focus within the modal while it is open
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => {
      const first = container.querySelector<HTMLElement>(focusableSelector)
      first?.focus()
    }
    focusFirst()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusableEls = container.querySelectorAll<HTMLElement>(focusableSelector)
      if (focusableEls.length === 0) return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <Backdrop data-modal-backdrop onClick={handleBackdropClick}>
      <Container ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <Header>
          <ModalTitle id={titleId}>{title}</ModalTitle>
          <CloseButton onClick={onClose} aria-label="閉じる">✕</CloseButton>
        </Header>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Container>
    </Backdrop>
  )
}
