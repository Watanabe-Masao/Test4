import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

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
  font-size: 0.6rem;
`

export const AnomalyDate = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

export const AnomalyValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`
