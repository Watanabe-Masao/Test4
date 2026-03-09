import { memo, useCallback, useRef } from 'react'
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

  // ── トラックドラッグ: 両ハンドル同時移動 ──
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; origStart: number; origEnd: number } | null>(null)

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const el = trackRef.current
      if (!el) return
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = { startX: e.clientX, origStart: start, origEnd: end }
    },
    [start, end],
  )

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current || !trackRef.current) return
      const trackWidth = trackRef.current.getBoundingClientRect().width
      const range = max - min
      const pxPerUnit = trackWidth / range
      const dx = e.clientX - dragRef.current.startX
      const shift = Math.round(dx / pxPerUnit)
      const { origStart, origEnd } = dragRef.current

      let newStart = origStart + shift
      let newEnd = origEnd + shift
      if (newStart < min) {
        newEnd += min - newStart
        newStart = min
      }
      if (newEnd > max) {
        newStart -= newEnd - max
        newEnd = max
      }
      newStart = Math.max(min, newStart)
      newEnd = Math.min(max, newEnd)
      if (newStart !== start || newEnd !== end) {
        onChange(newStart, newEnd)
      }
    },
    [min, max, start, end, onChange],
  )

  const handleTrackPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

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
      <TrackWrap ref={trackRef}>
        <Track />
        <ActiveTrack
          $left={leftPct}
          $right={rightPct}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
        />
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
