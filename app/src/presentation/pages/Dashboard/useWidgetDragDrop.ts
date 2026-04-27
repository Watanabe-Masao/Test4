/**
 * ウィジェット Drag & Drop フック
 *
 * DashboardPage のウィジェット並び替え D&D 状態管理を抽出。
 * ドラッグ中のインデックス追跡とドロップ時の配列並び替えを担当する。
 *
 * @guard C1 1ファイル = 1変更理由（D&D UX の変更時にのみ変わる）
 *
 * @responsibility R:unclassified
 */
import { useState, useRef, useCallback } from 'react'
import { saveLayout } from './widgets/widgetLayout'

export interface WidgetDragDropState {
  readonly dragIndex: number | null
  readonly overIndex: number | null
}

export interface WidgetDragDropHandlers {
  readonly handleDragStart: (index: number) => void
  readonly handleDragOver: (e: React.DragEvent, index: number) => void
  readonly handleDrop: (targetIndex: number) => void
  readonly handleDragEnd: () => void
}

export function useWidgetDragDrop(
  setWidgetIds: React.Dispatch<React.SetStateAction<string[]>>,
): WidgetDragDropState & WidgetDragDropHandlers {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback(
    (targetIndex: number) => {
      const sourceIndex = dragItemRef.current
      if (sourceIndex == null || sourceIndex === targetIndex) {
        setDragIndex(null)
        setOverIndex(null)
        return
      }
      setWidgetIds((prev) => {
        const next = [...prev]
        const [moved] = next.splice(sourceIndex, 1)
        next.splice(targetIndex, 0, moved)
        saveLayout(next)
        return next
      })
      setDragIndex(null)
      setOverIndex(null)
    },
    [setWidgetIds],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  return {
    dragIndex,
    overIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
