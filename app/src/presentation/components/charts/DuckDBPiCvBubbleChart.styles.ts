import styled from 'styled-components'

export const LegendRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[2]};
  justify-content: center;
`

export const LegendItem = styled.span<{ $color: string }>`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

export const QuadrantLabel = styled.div`
  position: absolute;
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  opacity: 0.6;
  font-weight: 600;
  pointer-events: none;
`
