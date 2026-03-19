import styled from 'styled-components'

export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

export const ChipGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  align-items: center;
`

export const ChipLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

export const ShiftCard = styled.div<{ $positive: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $positive, theme }) =>
    $positive ? theme.interactive.subtleBg : theme.interactive.subtleBg};
  border-left: 3px solid
    ${({ $positive, theme }) =>
      $positive ? theme.colors.palette.successDark : theme.colors.palette.dangerDark};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const ShiftName = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ShiftValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`
