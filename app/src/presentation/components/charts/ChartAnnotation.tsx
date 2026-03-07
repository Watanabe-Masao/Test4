/**
 * チャート注釈ポップオーバー
 *
 * floating-ui を使用してビューポート対応のポップオーバーを表示する。
 * ReferenceLine のラベル横や KPI カードの詳細説明に使用。
 *
 * @example
 * <ChartAnnotation ct={ct} content="目標粗利率。この線を超えれば健全な水準。">
 *   <span>目標 30%</span>
 * </ChartAnnotation>
 */
import { useState, type ReactNode } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'
import styled from 'styled-components'
import type { ChartTheme } from './chartTheme'

interface ChartAnnotationProps {
  /** ポップオーバーの内容（テキストまたは ReactNode） */
  content: ReactNode
  /** トリガー要素 */
  children: ReactNode
  /** ChartTheme インスタンス */
  ct: ChartTheme
  /** 配置方向（デフォルト: 'top'） */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const Trigger = styled.span`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  pointer-events: auto;
`

const Popover = styled.div<{ $ct: ChartTheme }>`
  background: ${(p) => p.$ct.bg2};
  border: 1px solid ${(p) => p.$ct.grid};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: ${(p) => p.$ct.fontSize.sm}px;
  font-family: ${(p) => p.$ct.fontFamily};
  color: ${(p) => p.$ct.text};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-width: 280px;
  line-height: 1.5;
  z-index: 1100;
`

export function ChartAnnotation({
  content,
  children,
  ct,
  placement = 'top',
}: ChartAnnotationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null)
  const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null)

  const { floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    elements: { reference: referenceEl, floating: floatingEl },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  return (
    <>
      <Trigger ref={setReferenceEl} {...getReferenceProps()}>
        {children}
      </Trigger>
      {isOpen && (
        <FloatingPortal>
          <Popover
            ref={setFloatingEl}
            style={floatingStyles}
            $ct={ct}
            {...getFloatingProps()}
            aria-label="注釈"
          >
            {content}
          </Popover>
        </FloatingPortal>
      )}
    </>
  )
}
