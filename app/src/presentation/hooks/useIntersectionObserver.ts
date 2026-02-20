/**
 * Phase 5.1: Intersection Observer フック
 *
 * 画面外のウィジェットを遅延レンダリングするためのフック。
 * 要素がビューポートに入ったときに初めてレンダリングを開始する。
 */
import { useRef, useState, useEffect, useCallback } from 'react'

export interface UseIntersectionObserverOptions {
  /** ルート要素 (デフォルト: viewport) */
  root?: Element | null
  /** ルートマージン (デフォルト: '200px') — 事前読み込み距離 */
  rootMargin?: string
  /** 交差閾値 (デフォルト: 0) */
  threshold?: number | number[]
  /** 一度表示したら監視を停止するか (デフォルト: true) */
  freezeOnceVisible?: boolean
}

export interface UseIntersectionObserverResult {
  /** 監視対象の ref */
  ref: (node: Element | null) => void
  /** 要素がビューポート内にあるか */
  isIntersecting: boolean
  /** 一度でもビューポートに入ったか */
  hasBeenVisible: boolean
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult {
  const {
    root = null,
    rootMargin = '200px',
    threshold = 0,
    freezeOnceVisible = true,
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodeRef = useRef<Element | null>(null)

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  const ref = useCallback(
    (node: Element | null) => {
      cleanup()
      nodeRef.current = node

      if (!node) return
      if (freezeOnceVisible && hasBeenVisible) return

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          const visible = entry.isIntersecting
          setIsIntersecting(visible)
          if (visible) {
            setHasBeenVisible(true)
            if (freezeOnceVisible) {
              cleanup()
            }
          }
        },
        { root, rootMargin, threshold },
      )
      observerRef.current.observe(node)
    },
    [root, rootMargin, threshold, freezeOnceVisible, hasBeenVisible, cleanup],
  )

  useEffect(() => cleanup, [cleanup])

  return { ref, isIntersecting, hasBeenVisible }
}
