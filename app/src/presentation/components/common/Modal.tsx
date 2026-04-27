import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Backdrop,
  Container,
  Header,
  ModalTitle,
  CloseButton,
  Body,
  Footer,
  type ModalSize,
} from './Modal.styles'

export type { ModalSize }

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

const springTransition = prefersReduced
  ? { duration: 0 }
  : { type: 'spring' as const, stiffness: 400, damping: 30 }

export function Modal({
  title,
  children,
  footer,
  onClose,
  size = 'md',
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  /** モーダル幅: sm(400px) / md(480px) / lg(640px)  * @responsibility R:unclassified
   */
  size?: ModalSize
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
    <Backdrop
      as={motion.div}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: prefersReduced ? 0 : 0.15 }}
      data-modal-backdrop
      onClick={handleBackdropClick}
    >
      <Container
        as={motion.div}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={springTransition}
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        $size={size}
      >
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
