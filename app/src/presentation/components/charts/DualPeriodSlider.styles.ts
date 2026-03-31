import styled from 'styled-components'

/** 全体ラッパー */
export const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]} 0;
`

/** トラック + バー + ハンドル を重ねるコンテナ */
export const TrackContainer = styled.div`
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: default;
  touch-action: none;
  user-select: none;
`

/** 背景トラック（全幅） */
export const TrackBg = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`

/** 期間バー（ドラッグで全体移動） */
export const PeriodBar = styled.div<{ $left: number; $right: number; $color: string }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  right: ${({ $right }) => $right}%;
  height: 6px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  opacity: 0.5;
  cursor: grab;
  z-index: 1;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.7;
  }

  &:active {
    cursor: grabbing;
    opacity: 0.8;
  }
`

/** ハンドル（●）— 個別端点のドラッグ */
export const Handle = styled.div<{ $pos: number; $color: string; $zIndex?: number }>`
  position: absolute;
  left: ${({ $pos }) => $pos}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ theme }) => theme.colors.bg3};
  cursor: ew-resize;
  z-index: ${({ $zIndex }) => $zIndex ?? 2};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.3)'};
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark' ? '0 1px 6px rgba(0,0,0,0.6)' : '0 1px 6px rgba(0,0,0,0.4)'};
  }
`

/** 下部のラベル行 */
export const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

/** 期間ラベル（色つきドット + テキスト） */
export const PeriodLabel = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

/** リセットボタン */
export const ResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  white-space: nowrap;
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`

/** 目盛りコンテナ */
export const TickRow = styled.div`
  position: relative;
  height: 12px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/** 目盛りラベル */
export const TickLabel = styled.span<{ $pos: number }>`
  position: absolute;
  left: ${({ $pos }) => $pos}%;
  transform: translateX(-50%);
  white-space: nowrap;
`
