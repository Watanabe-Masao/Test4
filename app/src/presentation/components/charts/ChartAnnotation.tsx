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
import type { ChartTheme } from './chartTheme'
import { Trigger, Popover } from './ChartAnnotation.styles'

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
