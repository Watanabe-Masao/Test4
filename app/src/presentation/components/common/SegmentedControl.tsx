/**
 * SegmentedControl — macOS 準拠の切替コントロール
 *
 * Track（凹みコンテナ）+ Thumb（浮き上がりインジケータ）で
 * 静かで上品な切替を実現する。チャートのビュー切替に使用。
 *
 * アクセシビリティ: role="radiogroup" + 矢印キーナビゲーション
 */
import { useCallback, useRef } from 'react'
import { Track, Segment } from './SegmentedControl.styles'

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
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
}: SegmentedControlProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)

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
          <Segment
            key={opt.value}
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
        )
      })}
    </Track>
  )
}
