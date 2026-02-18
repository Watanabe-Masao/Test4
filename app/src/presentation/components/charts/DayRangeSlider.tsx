import { useState, useCallback } from 'react'
import styled from 'styled-components'

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]} 0;
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  min-width: 44px;
  text-align: center;
`

const TrackWrap = styled.div`
  position: relative;
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
`

const Track = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`

const ActiveTrack = styled.div<{ $left: number; $right: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  right: ${({ $right }) => $right}%;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.6;
`

const RangeInput = styled.input`
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
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`

const ResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
`

interface Props {
  min: number
  max: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
}

export function DayRangeSlider({ min, max, start, end, onChange }: Props) {
  const leftPct = ((start - min) / (max - min)) * 100
  const rightPct = ((max - end) / (max - min)) * 100
  const isFullRange = start === min && end === max

  return (
    <SliderRow>
      <Label>{start}日</Label>
      <TrackWrap>
        <Track />
        <ActiveTrack $left={leftPct} $right={rightPct} />
        <RangeInput
          type="range"
          min={min}
          max={max}
          value={start}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v < end) onChange(v, end)
          }}
        />
        <RangeInput
          type="range"
          min={min}
          max={max}
          value={end}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v > start) onChange(start, v)
          }}
        />
      </TrackWrap>
      <Label>{end}日</Label>
      {!isFullRange && (
        <ResetBtn onClick={() => onChange(min, max)}>全期間</ResetBtn>
      )}
    </SliderRow>
  )
}

/** 日付範囲のstate管理フック */
export function useDayRange(daysInMonth: number): [number, number, (s: number, e: number) => void] {
  const [range, setRange] = useState<[number, number]>([1, daysInMonth])

  // daysInMonthが変わった場合にリセット
  const effectiveEnd = Math.min(range[1], daysInMonth)
  const effectiveStart = Math.min(range[0], effectiveEnd)

  const handleChange = useCallback((s: number, e: number) => {
    setRange([s, e])
  }, [])

  return [effectiveStart, effectiveEnd, handleChange]
}
