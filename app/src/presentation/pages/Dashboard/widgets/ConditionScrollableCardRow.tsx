/**
 * 横スクロール可能なカード行
 *
 * カードが画面幅を超える場合、左右の矢印ボタンでスムーズスクロールする。
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import type { ConditionCardId, UnifiedCardData } from './ConditionSummaryEnhanced.vm'
import { ConditionCardShell } from './ConditionCardShell'
import {
  CardScrollContainer,
  CardScrollInner,
  ScrollCard,
  ScrollArrow,
} from './ConditionSummaryEnhanced.styles'

export function ScrollableCardRow({
  cards,
  onCardClick,
}: {
  readonly cards: readonly UnifiedCardData[]
  readonly onCardClick: (id: ConditionCardId) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 4)
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', updateArrows)
    }
  }, [updateArrows, cards])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
  }, [])

  return (
    <CardScrollContainer>
      {showLeft && (
        <ScrollArrow $direction="left" onClick={() => scroll('left')} aria-label="左へスクロール">
          ‹
        </ScrollArrow>
      )}
      <CardScrollInner ref={scrollRef}>
        {cards.map((card) => (
          <ScrollCard key={card.id}>
            <ConditionCardShell card={card} onClick={() => onCardClick(card.id)} />
          </ScrollCard>
        ))}
      </CardScrollInner>
      {showRight && (
        <ScrollArrow $direction="right" onClick={() => scroll('right')} aria-label="右へスクロール">
          ›
        </ScrollArrow>
      )}
    </CardScrollContainer>
  )
}
