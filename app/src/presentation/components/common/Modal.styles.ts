import styled, { css } from 'styled-components'

export type ModalSize = 'sm' | 'md' | 'lg'

const sizeStyles = {
  sm: css`
    max-width: ${({ theme }) => theme.modal.width.sm};
  `,
  md: css`
    max-width: ${({ theme }) => theme.modal.width.md};
  `,
  lg: css`
    max-width: ${({ theme }) => theme.modal.width.lg};
  `,
}

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.interactive.backdrop};
  backdrop-filter: blur(${({ theme }) => theme.modal.backdropBlur});
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
`

export const Container = styled.div<{ $size: ModalSize }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  width: 90%;
  max-height: ${({ theme }) => theme.modal.maxHeight};
  overflow-y: auto;
  position: relative;
  ${({ $size }) => sizeStyles[$size]}
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const Body = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
`

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[8]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`
