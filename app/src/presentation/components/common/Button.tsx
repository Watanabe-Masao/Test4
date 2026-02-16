import styled, { css } from 'styled-components'

type ButtonVariant = 'primary' | 'success' | 'outline' | 'ghost'

const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.palette.primary}, ${({ theme }) => theme.colors.palette.primaryDark});
    color: white;
    border: none;
  `,
  success: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.palette.success}, ${({ theme }) => theme.colors.palette.successDark});
    color: white;
    border: none;
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.text2};
    border: none;
  `,
}

export const Button = styled.button<{ $variant?: ButtonVariant; $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};

  ${({ $variant = 'primary' }) => variantStyles[$variant]}

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
