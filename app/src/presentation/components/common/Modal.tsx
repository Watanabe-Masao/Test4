import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { Backdrop, Container, Header, ModalTitle, CloseButton, Body, Footer } from './Modal.styles'

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
          <CloseButton onClick={onClose} aria-label="閉じる">
            ✕
          </CloseButton>
        </Header>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Container>
    </Backdrop>
  )
}
