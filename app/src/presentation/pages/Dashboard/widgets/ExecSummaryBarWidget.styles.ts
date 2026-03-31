import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

export const WarningBanner = styled.div<{ $clickable?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.warning};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? `${palette.warningDark}1F` : `${palette.warningDark}14`};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? `${palette.warningDark}4D` : `${palette.warningDark}40`};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin-top: ${({ theme }) => theme.spacing[2]};
  line-height: 1.4;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    &:hover {
      background: ${palette.warningDark}2E;
      border-color: ${palette.warningDark}80;
    }
  `}
`
