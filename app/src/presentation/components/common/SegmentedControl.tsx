/**
 * SegmentedControl — macOS 準拠の切替コントロール
 *
 * Track（凹みコンテナ）+ Thumb（浮き上がりインジケータ）で
 * 静かで上品な切替を実現する。チャートのビュー切替に使用。
 *
 * motion.div の layoutId でアクティブインジケータがスムーズにスライドする。
 * prefers-reduced-motion 時は即時切替にフォールバック。
 *
 * アクセシビリティ: role="radiogroup" + 矢印キーナビゲーション
 * @responsibility R:unclassified
 */
import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Track, Segment, SegmentWrapper } from './SegmentedControl.styles'

export interface SegmentOption<T extends string> {
  readonly value: T
  readonly label: string
}

interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly size?: 'sm' | 'md'
  readonly ariaLabel?: string
  /** layoutId のプレフィックス（同一画面に複数ある場合に一意化） */
  readonly layoutId?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
  layoutId = 'seg',
}: SegmentedControlProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = options.findIndex((o) => o.value === value)
      if (idx < 0) return
      let next = idx
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % options.length
        e.preventDefault()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + options.length) % options.length
        e.preventDefault()
      } else if (e.key === 'Home') {
        next = 0
        e.preventDefault()
      } else if (e.key === 'End') {
        next = options.length - 1
        e.preventDefault()
      } else {
        return
      }
      onChange(options[next].value)
      const buttons = trackRef.current?.querySelectorAll('button')
      buttons?.[next]?.focus()
    },
    [options, value, onChange],
  )

  return (
    <Track ref={trackRef} role="radiogroup" aria-label={ariaLabel} $size={size}>
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <SegmentWrapper key={opt.value}>
            {isActive && (
              <motion.div
                layoutId={layoutId}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  zIndex: 0,
                }}
                className="seg-indicator"
                transition={
                  prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }
                }
              />
            )}
            <Segment
              $active={isActive}
              $size={size}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={handleKeyDown}
            >
              {opt.label}
            </Segment>
          </SegmentWrapper>
        )
      })}
    </Track>
  )
}
