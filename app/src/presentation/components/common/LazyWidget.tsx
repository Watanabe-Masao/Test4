/**
 * Phase 5.1: 遅延レンダリングウィジェットラッパー
 *
 * Intersection Observer を利用して、画面外のウィジェットは
 * プレースホルダーのみ描画し、表示領域に入ったときに初めてレンダリングする。
 */
import { type ReactNode } from 'react'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'
import { ChartSkeleton } from './Skeleton'

export interface LazyWidgetProps {
  /** 子要素 (遅延レンダリング対象) */
  children: ReactNode
  /** プレースホルダーの最小高さ (px) */
  minHeight?: number
  /** カスタムプレースホルダー */
  placeholder?: ReactNode
  /** ルートマージン — ビューポートからの事前読み込み距離 */
  rootMargin?: string
}

export function LazyWidget({
  children,
  minHeight = 200,
  placeholder,
  rootMargin = '300px',
}: LazyWidgetProps) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin,
    freezeOnceVisible: true,
  })

  return (
    <div ref={ref}>
      {hasBeenVisible ? children : (placeholder ?? <ChartSkeleton height={`${minHeight}px`} />)}
    </div>
  )
}
