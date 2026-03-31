/**
 * Dashboard — ウィジェットD&D + ラッパースタイル
 *
 * ドラッグ＆ドロップ、削除ボタン、リンクボタン。
 */
import styled from 'styled-components'

export const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver, theme }) =>
    $isOver
      ? `
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed ${theme.colors.palette.primary};
      border-radius: ${theme.radii.lg};
      pointer-events: none;
      z-index: 1;
    }
  `
      : ''}
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
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
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
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
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

export const WidgetLinkBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  opacity: 0;
  transition:
    opacity 0.2s,
    color 0.15s;
  z-index: 2;
  &:hover {
    color: ${({ theme }) => theme.colors.palette.primary};
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const WidgetWrapper = styled.div`
  position: relative;
  &:hover ${WidgetLinkBtn} {
    opacity: 0.7;
  }
`
