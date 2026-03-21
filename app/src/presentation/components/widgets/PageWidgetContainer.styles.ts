import styled, { css } from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

export const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver }) =>
    $isOver &&
    css`
      &::before {
        content: '';
        position: absolute;
        inset: -3px;
        border: 2px dashed ${({ theme }) => theme.colors.palette.primary};
        border-radius: ${({ theme }) => theme.radii.lg};
        pointer-events: none;
        z-index: 1;
      }
    `}
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`

export const DragHandle = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
`

export const DeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  top: 4px;
  right: 26px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.danger};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
  &:hover {
    opacity: 1 !important;
    filter: brightness(1.1);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const WidgetWrapper = styled.div`
  position: relative;
`

export const LazyPlaceholder = styled.div`
  min-height: 300px;
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

export const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
