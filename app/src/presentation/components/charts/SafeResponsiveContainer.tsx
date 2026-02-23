/**
 * Recharts ResponsiveContainer のラッパー。
 * 親コンテナが正のサイズを持つまでチャートのレンダーを遅延させ、
 * width(-1)/height(-1) の警告を防止する。
 */
import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

type Props = ComponentProps<typeof ResponsiveContainer>

export function SafeResponsiveContainer({
  children,
  width,
  height,
  minWidth,
  minHeight,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setReady(true)
          observer.disconnect()
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
        width: typeof width === 'number' ? width : (width || '100%'),
        height: typeof height === 'number' ? height : (height || '100%'),
        minWidth: minWidth ?? 0,
        minHeight: minHeight ?? 0,
      }}
    >
      {ready && (
        <ResponsiveContainer width="100%" height="100%" {...rest}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  )
}
