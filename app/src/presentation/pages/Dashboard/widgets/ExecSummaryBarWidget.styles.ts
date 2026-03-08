import styled from 'styled-components'

export const WarningBanner = styled.div<{ $clickable?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.warning};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.12)' : 'rgba(234,179,8,0.08)'};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.25)')};
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
      background: rgba(234,179,8,0.18);
      border-color: rgba(234,179,8,0.5);
    }
  `}
`
