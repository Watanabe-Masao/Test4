import styled from 'styled-components'

export const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]} 0;
`

export const NumInput = styled.input`
  width: 38px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px 4px;
  text-align: center;
  appearance: textfield;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const UnitLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
`

export const TrackWrap = styled.div`
  position: relative;
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
`

export const Track = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`

export const ActiveTrack = styled.div<{ $left: number; $right: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  right: ${({ $right }) => $right}%;
  height: 12px;
  margin-top: -4px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
  z-index: 1;

  &:active {
    cursor: grabbing;
    opacity: 0.8;
  }
`

export const RangeInput = styled.input`
  position: absolute;
  width: 100%;
  height: 20px;
  appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    pointer-events: auto;
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.3)'};
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    pointer-events: auto;
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.3)'};
  }
`

export const StepBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  line-height: 1;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`

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

export const WarningLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.warning};
  white-space: nowrap;
  font-weight: 600;
`
