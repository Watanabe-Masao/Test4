import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useAppState } from '@/application/context'

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]} 0;
`

const NumInput = styled.input`
  width: 38px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
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

const UnitLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
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

const StepBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 0.55rem;
  line-height: 1;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
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
  white-space: nowrap;
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

  const handleStartInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!isNaN(v) && v >= min && v < end) onChange(v, end)
  }, [min, end, onChange])

  const handleEndInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!isNaN(v) && v <= max && v > start) onChange(start, v)
  }, [max, start, onChange])

  return (
    <SliderRow>
      <StepBtn disabled={start <= min} onClick={() => onChange(start - 1, end)} aria-label="開始日を1日前へ">◀</StepBtn>
      <NumInput
        type="number"
        min={min}
        max={end - 1}
        value={start}
        onChange={handleStartInput}
      />
      <StepBtn disabled={start >= end - 1} onClick={() => onChange(start + 1, end)} aria-label="開始日を1日後へ">▶</StepBtn>
      <UnitLabel>日</UnitLabel>
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
      <StepBtn disabled={end <= start + 1} onClick={() => onChange(start, end - 1)} aria-label="終了日を1日前へ">◀</StepBtn>
      <NumInput
        type="number"
        min={start + 1}
        max={max}
        value={end}
        onChange={handleEndInput}
      />
      <StepBtn disabled={end >= max} onClick={() => onChange(start, end + 1)} aria-label="終了日を1日後へ">▶</StepBtn>
      <UnitLabel>日</UnitLabel>
      {!isFullRange && (
        <ResetBtn onClick={() => onChange(min, max)}>全期間</ResetBtn>
      )}
    </SliderRow>
  )
}

/** 日付範囲のstate管理フック（取込データ有効期間に自動連動） */
export function useDayRange(daysInMonth: number): [number, number, (s: number, e: number) => void] {
  const { settings } = useAppState()
  const dataEndDay = settings.dataEndDay

  const defaultEnd = dataEndDay != null ? Math.min(dataEndDay, daysInMonth) : daysInMonth
  const [range, setRange] = useState<[number, number]>([1, defaultEnd])
  const [prevDataEndDay, setPrevDataEndDay] = useState(dataEndDay)

  // 取込データ有効期間が変わったらリセット
  if (dataEndDay !== prevDataEndDay) {
    setPrevDataEndDay(dataEndDay)
    const newEnd = dataEndDay != null ? Math.min(dataEndDay, daysInMonth) : daysInMonth
    setRange([1, newEnd])
  }

  const effectiveEnd = Math.min(range[1], daysInMonth)
  const effectiveStart = Math.min(range[0], effectiveEnd)

  const handleChange = useCallback((s: number, e: number) => {
    setRange([s, e])
  }, [])

  return [effectiveStart, effectiveEnd, handleChange]
}
