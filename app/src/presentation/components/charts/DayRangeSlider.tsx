import { memo, useCallback } from 'react'
import {
  ActiveTrack,
  NumInput,
  RangeInput,
  ResetBtn,
  SliderRow,
  StepBtn,
  Track,
  TrackWrap,
  UnitLabel,
  WarningLabel,
} from './DayRangeSlider.styles'

interface Props {
  min: number
  max: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
  /** 取込データ有効期間（経過日数）。超過時に警告表示 */
  elapsedDays?: number
}

export const DayRangeSlider = memo(function DayRangeSlider({
  min,
  max,
  start,
  end,
  onChange,
  elapsedDays,
}: Props) {
  const leftPct = ((start - min) / (max - min)) * 100
  const rightPct = ((max - end) / (max - min)) * 100
  const isFullRange = start === min && end === max
  const exceedsValidPeriod = elapsedDays != null && elapsedDays > 0 && end > elapsedDays

  const handleStartInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (!isNaN(v) && v >= min && v <= end) onChange(v, end)
    },
    [min, end, onChange],
  )

  const handleEndInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (!isNaN(v) && v <= max && v >= start) onChange(start, v)
    },
    [max, start, onChange],
  )

  return (
    <SliderRow>
      <StepBtn
        disabled={start <= min}
        onClick={() => onChange(start - 1, end)}
        aria-label="開始日を1日前へ"
      >
        ◀
      </StepBtn>
      <NumInput
        type="number"
        min={min}
        max={end}
        value={start}
        onChange={handleStartInput}
        aria-label="開始日"
      />
      <StepBtn
        disabled={start >= end}
        onClick={() => onChange(start + 1, end)}
        aria-label="開始日を1日後へ"
      >
        ▶
      </StepBtn>
      <UnitLabel>日</UnitLabel>
      <TrackWrap>
        <Track />
        <ActiveTrack $left={leftPct} $right={rightPct} />
        <RangeInput
          type="range"
          min={min}
          max={max}
          value={start}
          aria-label="開始日スライダー"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={start}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v <= end) onChange(v, end)
          }}
        />
        <RangeInput
          type="range"
          min={min}
          max={max}
          value={end}
          aria-label="終了日スライダー"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={end}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v >= start) onChange(start, v)
          }}
        />
      </TrackWrap>
      <StepBtn
        disabled={end <= start}
        onClick={() => onChange(start, end - 1)}
        aria-label="終了日を1日前へ"
      >
        ◀
      </StepBtn>
      <NumInput
        type="number"
        min={start}
        max={max}
        value={end}
        onChange={handleEndInput}
        aria-label="終了日"
      />
      <StepBtn
        disabled={end >= max}
        onClick={() => onChange(start, end + 1)}
        aria-label="終了日を1日後へ"
      >
        ▶
      </StepBtn>
      <UnitLabel>日</UnitLabel>
      {!isFullRange && (
        <ResetBtn onClick={() => onChange(min, max)} aria-label="全期間にリセット">
          全期間
        </ResetBtn>
      )}
      {exceedsValidPeriod && <WarningLabel>{elapsedDays}日以降はデータなし</WarningLabel>}
    </SliderRow>
  )
})
