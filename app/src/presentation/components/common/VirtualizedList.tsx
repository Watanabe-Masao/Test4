/**
 * Phase 5.1: 仮想スクロールリストコンポーネント
 *
 * react-window を利用して大量アイテムを効率的にレンダリングする。
 * 画面内に表示されている行のみ DOM に描画し、メモリと CPU を節約する。
 */
import { useRef, useCallback, type ReactNode, type CSSProperties } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import styled from 'styled-components'

// ─── Types ────────────────────────────────────────────

export interface VirtualizedListProps<T> {
  /** レンダリング対象のアイテム配列 */
  items: readonly T[]
  /** 各行の高さ (px) */
  rowHeight: number
  /** リスト全体の高さ (px) */
  height: number
  /** リスト全体の幅 */
  width?: number | string
  /** 行レンダラー */
  renderRow: (item: T, index: number, style: CSSProperties) => ReactNode
  /** 先読み行数 (デフォルト: 5) */
  overscanCount?: number
  /** 空表示メッセージ */
  emptyMessage?: string
}

// ─── Styled Components ────────────────────────────────

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

// ─── Component ────────────────────────────────────────

export function VirtualizedList<T>({
  items,
  rowHeight,
  height,
  width = '100%',
  renderRow,
  overscanCount = 5,
  emptyMessage = 'データがありません',
}: VirtualizedListProps<T>) {
  const listRef = useRef<FixedSizeList>(null)

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = items[index]
      return <>{renderRow(item, index, style)}</>
    },
    [items, renderRow],
  )

  if (items.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>
  }

  return (
    <FixedSizeList
      ref={listRef}
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={rowHeight}
      overscanCount={overscanCount}
    >
      {Row}
    </FixedSizeList>
  )
}
