import styled from 'styled-components'
import { useCallback, useEffect, type ReactNode } from 'react'

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

  return (
    <Backdrop data-modal-backdrop onClick={handleBackdropClick}>
      <Container>
        <Header>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Container>
    </Backdrop>
  )
}
