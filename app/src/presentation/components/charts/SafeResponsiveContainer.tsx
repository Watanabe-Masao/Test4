/**
 * Recharts ResponsiveContainer の代替。
 * ResizeObserver で親コンテナのサイズを計測し、正のサイズが確定してから
 * チャートに直接ピクセル寸法を渡す。ResponsiveContainer の初期状態
 * width(-1)/height(-1) による警告を完全に回避する。
 */
import {
  type ReactElement,
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
} from 'react'

interface SafeResponsiveContainerProps {
  readonly children: ReactElement
  readonly width?: string | number
  readonly height?: string | number
  readonly minWidth?: number
  readonly minHeight?: number
}

export function SafeResponsiveContainer({
  children,
  width,
  height,
  minWidth,
  minHeight,
}: SafeResponsiveContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width)
        const h = Math.round(entry.contentRect.height)
        if (w > 0 && h > 0) {
          setDims((prev) =>
            prev && prev.w === w && prev.h === h ? prev : { w, h },
          )
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        width: typeof width === 'number' ? width : width || '100%',
        height: typeof height === 'number' ? height : height || '100%',
        minWidth: minWidth ?? 0,
        minHeight: minHeight ?? 0,
      }}
    >
      {dims &&
        cloneElement(Children.only(children) as ReactElement<Record<string, unknown>>, {
          width: dims.w,
          height: dims.h,
        })}
    </div>
  )
}
