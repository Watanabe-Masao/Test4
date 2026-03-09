/**
 * DualPeriodSlider — 2期間を1本のトラックに重ねて表示するスライダー
 *
 * ## 操作
 *
 * - ハンドル（●）をドラッグ → その端点だけ移動
 * - バー（期間の帯）をドラッグ → 期間幅を固定したまま全体移動
 * - 期間1: indigo (#6366f1)、期間2: amber (#f59e0b)
 *
 * ## 設計
 *
 * - HTML range input ではなく、div + pointer events で実装
 * - ピクセル座標 → 日数 の変換は trackRef の幅で算出
 * - DayRangeSlider と同じ Props パターン（min/max/start/end/onChange）を2セット
 */
import { memo, useRef, useCallback, useState } from 'react'
import {
  SliderWrapper,
  TrackContainer,
  TrackBg,
  PeriodBar,
  Handle,
  LabelRow,
  PeriodLabel,
  ResetBtn,
  TickRow,
  TickLabel,
} from './DualPeriodSlider.styles'

// ── 定数 ──

const P1_COLOR = '#6366f1'
const P2_COLOR = '#f59e0b'

// ── Types ──

interface Props {
  min: number
  max: number
  /** 期間1 開始日 */
  p1Start: number
  /** 期間1 終了日 */
  p1End: number
  /** 期間1 変更コールバック */
  onP1Change: (start: number, end: number) => void
  /** 期間2 開始日 */
  p2Start?: number
  /** 期間2 終了日 */
  p2End?: number
  /** 期間2 変更コールバック */
  onP2Change?: (start: number, end: number) => void
  /** 期間2 有効フラグ */
  p2Enabled?: boolean
  /** 期間1 ラベル（デフォルト: '期間1'） */
  p1Label?: string
  /** 期間2 ラベル（デフォルト: '期間2'） */
  p2Label?: string
  /** 警告表示: 有効日数 */
  elapsedDays?: number
}

type DragKind = 'p1Start' | 'p1End' | 'p1Body' | 'p2Start' | 'p2End' | 'p2Body'

interface DragState {
  kind: DragKind
  /** ドラッグ開始時の X ピクセル */
  originX: number
  /** ドラッグ開始時の値（ハンドル: その端点の日、ボディ: start） */
  originVal: number
  /** ボディドラッグ用: 幅 (end - start) */
  span: number
}

// ── ユーティリティ ──

/** ピクセル → 日数変換（連続値） */
function pxToDay(px: number, trackWidth: number, min: number, max: number): number {
  if (trackWidth <= 0) return min
  const ratio = px / trackWidth
  return min + ratio * (max - min)
}

/** 日数 → パーセント変換 */
function dayToPct(day: number, min: number, max: number): number {
  if (max === min) return 0
  return ((day - min) / (max - min)) * 100
}

/** 値をクランプ */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ── コンポーネント ──

export const DualPeriodSlider = memo(function DualPeriodSlider({
  min,
  max,
  p1Start,
  p1End,
  onP1Change,
  p2Start,
  p2End,
  onP2Change,
  p2Enabled = false,
  p1Label = '期間1',
  p2Label = '期間2',
  elapsedDays,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const isFullRange =
    p1Start === min && p1End === max && (!p2Enabled || (p2Start === min && p2End === max))

  // ── 座標変換 ──

  const getTrackX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return clientX - rect.left
  }, [])

  // ── ポインターイベント ──

  const handlePointerDown = useCallback(
    (kind: DragKind) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      let originVal: number
      let span = 0

      switch (kind) {
        case 'p1Start':
          originVal = p1Start
          break
        case 'p1End':
          originVal = p1End
          break
        case 'p1Body':
          originVal = p1Start
          span = p1End - p1Start
          break
        case 'p2Start':
          originVal = p2Start ?? min
          break
        case 'p2End':
          originVal = p2End ?? max
          break
        case 'p2Body':
          originVal = p2Start ?? min
          span = (p2End ?? max) - (p2Start ?? min)
          break
      }

      dragRef.current = {
        kind,
        originX: getTrackX(e.clientX),
        originVal,
        span,
      }
      setIsDragging(true)
    },
    [p1Start, p1End, p2Start, p2End, min, max, getTrackX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !trackRef.current) return

      const trackWidth = trackRef.current.offsetWidth
      const currentX = getTrackX(e.clientX)
      const currentDay = pxToDay(currentX, trackWidth, min, max)

      switch (drag.kind) {
        case 'p1Start': {
          const newStart = clamp(Math.round(currentDay), min, p1End)
          if (newStart !== p1Start) onP1Change(newStart, p1End)
          break
        }
        case 'p1End': {
          const newEnd = clamp(Math.round(currentDay), p1Start, max)
          if (newEnd !== p1End) onP1Change(p1Start, newEnd)
          break
        }
        case 'p1Body': {
          const deltaPx = currentX - drag.originX
          const deltaDay = Math.round(pxToDay(deltaPx, trackWidth, 0, max - min))
          const newStart = clamp(drag.originVal + deltaDay, min, max - drag.span)
          const newEnd = newStart + drag.span
          if (newStart !== p1Start || newEnd !== p1End) {
            onP1Change(newStart, newEnd)
          }
          break
        }
        case 'p2Start': {
          if (!onP2Change || !p2Enabled) break
          const newStart = clamp(Math.round(currentDay), min, p2End ?? max)
          if (newStart !== p2Start) onP2Change(newStart, p2End ?? max)
          break
        }
        case 'p2End': {
          if (!onP2Change || !p2Enabled) break
          const newEnd = clamp(Math.round(currentDay), p2Start ?? min, max)
          if (newEnd !== p2End) onP2Change(p2Start ?? min, newEnd)
          break
        }
        case 'p2Body': {
          if (!onP2Change || !p2Enabled) break
          const deltaPx = currentX - drag.originX
          const deltaDay = Math.round(pxToDay(deltaPx, trackWidth, 0, max - min))
          const newStart = clamp(drag.originVal + deltaDay, min, max - drag.span)
          const newEnd = newStart + drag.span
          if (newStart !== p2Start || newEnd !== p2End) {
            onP2Change(newStart, newEnd)
          }
          break
        }
      }
    },
    [min, max, p1Start, p1End, p2Start, p2End, p2Enabled, onP1Change, onP2Change, getTrackX],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  // ── パーセント算出 ──

  const p1LeftPct = dayToPct(p1Start, min, max)
  const p1RightPct = 100 - dayToPct(p1End, min, max)
  const p1StartPct = dayToPct(p1Start, min, max)
  const p1EndPct = dayToPct(p1End, min, max)

  const showP2 = p2Enabled && p2Start != null && p2End != null && onP2Change != null
  const p2LeftPct = showP2 ? dayToPct(p2Start!, min, max) : 0
  const p2RightPct = showP2 ? 100 - dayToPct(p2End!, min, max) : 100
  const p2StartPct = showP2 ? dayToPct(p2Start!, min, max) : 0
  const p2EndPct = showP2 ? dayToPct(p2End!, min, max) : 0

  // ── 目盛り ──

  const ticks: number[] = []
  const step = max <= 15 ? 1 : max <= 31 ? 5 : 10
  for (let d = min; d <= max; d += step) ticks.push(d)
  if (ticks[ticks.length - 1] !== max) ticks.push(max)

  return (
    <SliderWrapper>
      <TrackContainer
        ref={trackRef}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={isDragging ? handlePointerUp : undefined}
        onPointerCancel={isDragging ? handlePointerUp : undefined}
      >
        <TrackBg />

        {/* ── 期間2（下層に描画 → 重なり時に期間1が上） ── */}
        {showP2 && (
          <>
            <PeriodBar
              $left={p2LeftPct}
              $right={p2RightPct}
              $color={P2_COLOR}
              onPointerDown={handlePointerDown('p2Body')}
              aria-label={`${p2Label}バー`}
            />
            <Handle
              $pos={p2StartPct}
              $color={P2_COLOR}
              $zIndex={2}
              onPointerDown={handlePointerDown('p2Start')}
              aria-label={`${p2Label}開始`}
            />
            <Handle
              $pos={p2EndPct}
              $color={P2_COLOR}
              $zIndex={2}
              onPointerDown={handlePointerDown('p2End')}
              aria-label={`${p2Label}終了`}
            />
          </>
        )}

        {/* ── 期間1（上層） ── */}
        <PeriodBar
          $left={p1LeftPct}
          $right={p1RightPct}
          $color={P1_COLOR}
          onPointerDown={handlePointerDown('p1Body')}
          aria-label={`${p1Label}バー`}
        />
        <Handle
          $pos={p1StartPct}
          $color={P1_COLOR}
          $zIndex={3}
          onPointerDown={handlePointerDown('p1Start')}
          aria-label={`${p1Label}開始`}
        />
        <Handle
          $pos={p1EndPct}
          $color={P1_COLOR}
          $zIndex={3}
          onPointerDown={handlePointerDown('p1End')}
          aria-label={`${p1Label}終了`}
        />
      </TrackContainer>

      {/* ── 目盛り ── */}
      <TickRow>
        {ticks.map((d) => (
          <TickLabel key={d} $pos={dayToPct(d, min, max)}>
            {d}
          </TickLabel>
        ))}
      </TickRow>

      {/* ── ラベル行 ── */}
      <LabelRow>
        <PeriodLabel $color={P1_COLOR}>
          {p1Label}: {p1Start}〜{p1End}日
        </PeriodLabel>
        {showP2 && (
          <PeriodLabel $color={P2_COLOR}>
            {p2Label}: {p2Start}〜{p2End}日
          </PeriodLabel>
        )}
        {elapsedDays != null && elapsedDays > 0 && p1End > elapsedDays && (
          <span style={{ fontSize: '0.55rem', color: '#fbbf24', fontWeight: 600 }}>
            {elapsedDays}日以降はデータなし
          </span>
        )}
        {!isFullRange && (
          <ResetBtn
            onClick={() => {
              onP1Change(min, max)
              if (showP2 && onP2Change) onP2Change(min, max)
            }}
            aria-label="全期間にリセット"
          >
            全期間
          </ResetBtn>
        )}
      </LabelRow>
    </SliderWrapper>
  )
})
