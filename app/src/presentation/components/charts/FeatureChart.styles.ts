import styled from 'styled-components'

export const AnomalyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

export const AnomalyCard = styled.div<{ $type: 'spike' | 'dip' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $type, theme }) =>
    $type === 'spike'
      ? theme.mode === 'dark'
        ? `${theme.colors.palette.dangerDark}1f`
        : `${theme.colors.palette.dangerDark}0f`
      : theme.mode === 'dark'
        ? `${theme.colors.palette.blueDark}1f`
        : `${theme.colors.palette.blueDark}0f`};
  border-left: 3px solid
    ${({ $type, theme }) =>
      $type === 'spike' ? theme.colors.palette.dangerDark : theme.colors.palette.blueDark};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const AnomalyDate = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const AnomalyValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`
