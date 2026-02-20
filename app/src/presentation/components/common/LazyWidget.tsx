/**
 * Phase 5.1: 遅延レンダリングウィジェットラッパー
 *
 * Intersection Observer を利用して、画面外のウィジェットは
 * プレースホルダーのみ描画し、表示領域に入ったときに初めてレンダリングする。
 */
import { type ReactNode } from 'react'
import styled from 'styled-components'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'

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

const Placeholder = styled.div<{ $minHeight: number }>`
  min-height: ${({ $minHeight }) => $minHeight}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

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
      {hasBeenVisible
        ? children
        : placeholder ?? <Placeholder $minHeight={minHeight}>...</Placeholder>}
    </div>
  )
}
