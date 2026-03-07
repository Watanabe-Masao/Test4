/**
 * ページ横断ウィジェットコンテナ
 *
 * 各ページに組み込むことで、ウィジェットの表示・並べ替え・
 * 設定UIを統一的に提供する。
 */
import { useState, useCallback, useRef, memo, type ReactNode } from 'react'
import styled from 'styled-components'
import { Chip, ChipGroup, ChartErrorBoundary } from '@/presentation/components/common'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'
import type { WidgetDef, PageWidgetConfig } from './types'
import { loadPageLayout, savePageLayout, buildWidgetMap } from './widgetLayout'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'

// ─── Styled Components ──────────────────────────────────

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver, theme }) =>
    $isOver
      ? `
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed ${theme.colors.palette.primary};
      border-radius: ${theme.radii.lg};
      pointer-events: none;
      z-index: 1;
    }
  `
      : ''}
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`

const DragHandle = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
`

const DeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  top: 4px;
  right: 26px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.danger};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & {
    opacity: 1;
  }
  &:hover {
    opacity: 1 !important;
    filter: brightness(1.1);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const WidgetWrapper = styled.div`
  position: relative;
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

// ─── Lazy Widget ────────────────────────────────────────

const LazyWidget = memo(function LazyWidget({ children }: { children: ReactNode }) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: '200px',
    freezeOnceVisible: true,
  })

  return <div ref={ref}>{hasBeenVisible ? children : <div style={{ minHeight: 300 }} />}</div>
})

// ─── Component ──────────────────────────────────────────

interface Props<T> {
  /** ページウィジェット設定 */
  readonly config: PageWidgetConfig<T>
  /** ウィジェットに渡すコンテキスト */
  readonly context: T
  /** ツールバーに追加する要素（CurrencyUnitToggle など） */
  readonly toolbarExtra?: ReactNode
  /** ウィジェット外のページ固有コンテンツ（ウィジェットの前に表示） */
  readonly headerContent?: ReactNode
}

export function PageWidgetContainer<T>({ config, context, toolbarExtra, headerContent }: Props<T>) {
  const { pageKey, registry, defaultWidgetIds, settingsTitle } = config
  const widgetMap = buildWidgetMap(registry)

  const [widgetIds, setWidgetIds] = useState<string[]>(() =>
    loadPageLayout(pageKey, registry as readonly WidgetDef<unknown>[], defaultWidgetIds),
  )
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // D&D state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleApplyLayout = useCallback(
    (ids: string[]) => {
      setWidgetIds(ids)
      savePageLayout(pageKey, ids)
    },
    [pageKey],
  )

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
        savePageLayout(pageKey, next)
        return next
      })
      setDragIndex(null)
      setOverIndex(null)
    },
    [pageKey],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      setWidgetIds((prev) => {
        const next = prev.filter((id) => id !== widgetId)
        savePageLayout(pageKey, next)
        return next
      })
    },
    [pageKey],
  )

  // Resolve active widgets
  const activeWidgets = widgetIds
    .map((id) => widgetMap.get(id))
    .filter((w): w is WidgetDef<T> => w != null)
    .filter((w) => (w.isVisible ? w.isVisible(context) : true))

  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  let flatIdx = 0

  const renderDraggable = (widget: WidgetDef<T>, index: number, content: ReactNode) => {
    if (!editMode) {
      return (
        <WidgetWrapper key={widget.id} data-widget-id={widget.id}>
          {content}
        </WidgetWrapper>
      )
    }
    return (
      <DragItem
        key={widget.id}
        data-widget-id={widget.id}
        draggable
        $isDragging={dragIndex === index}
        $isOver={overIndex === index}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={() => handleDrop(index)}
        onDragEnd={handleDragEnd}
      >
        <DeleteBtn
          onClick={(e) => {
            e.stopPropagation()
            handleRemoveWidget(widget.id)
          }}
          title="削除"
        >
          ×
        </DeleteBtn>
        <DragHandle>⠿</DragHandle>
        {content}
      </DragItem>
    )
  }

  return (
    <>
      <Toolbar>
        {toolbarExtra}
        <ChipGroup>
          <Chip $active={editMode} onClick={() => setEditMode(!editMode)}>
            {editMode ? '編集完了' : '並べ替え'}
          </Chip>
          <Chip $active={false} onClick={() => setShowSettings(true)}>
            ウィジェット設定
          </Chip>
        </ChipGroup>
      </Toolbar>

      {headerContent}

      {activeWidgets.length === 0 && (
        <EmptyState>
          <EmptyTitle>ウィジェットが選択されていません</EmptyTitle>
          <p>「ウィジェット設定」からウィジェットを追加してください。</p>
        </EmptyState>
      )}

      {/* KPI Widgets */}
      {kpiWidgets.length > 0 && (
        <WidgetGridStyled>
          {kpiWidgets.map((w) => {
            const idx = flatIdx++
            return renderDraggable(w, idx, w.render(context))
          })}
        </WidgetGridStyled>
      )}

      {/* Chart / Full / Half Widgets */}
      {chartWidgets.length > 0 &&
        (() => {
          const elements: ReactNode[] = []
          let halfBuffer: WidgetDef<T>[] = []

          const flushHalves = () => {
            if (halfBuffer.length === 0) return
            if (halfBuffer.length === 2) {
              const idx1 = flatIdx++
              const idx2 = flatIdx++
              elements.push(
                <ChartRow key={`half-${halfBuffer[0].id}`}>
                  {renderDraggable(
                    halfBuffer[0],
                    idx1,
                    <ChartErrorBoundary>
                      <LazyWidget>{halfBuffer[0].render(context)}</LazyWidget>
                    </ChartErrorBoundary>,
                  )}
                  {renderDraggable(
                    halfBuffer[1],
                    idx2,
                    <ChartErrorBoundary>
                      <LazyWidget>{halfBuffer[1].render(context)}</LazyWidget>
                    </ChartErrorBoundary>,
                  )}
                </ChartRow>,
              )
            } else {
              const idx1 = flatIdx++
              elements.push(
                <ChartRow key={`half-${halfBuffer[0].id}`}>
                  {renderDraggable(
                    halfBuffer[0],
                    idx1,
                    <ChartErrorBoundary>
                      <LazyWidget>{halfBuffer[0].render(context)}</LazyWidget>
                    </ChartErrorBoundary>,
                  )}
                </ChartRow>,
              )
            }
            halfBuffer = []
          }

          chartWidgets.forEach((w) => {
            if (w.size === 'full') {
              flushHalves()
              const idx = flatIdx++
              elements.push(
                <FullChartRow key={w.id}>
                  {renderDraggable(
                    w,
                    idx,
                    <ChartErrorBoundary>
                      <LazyWidget>{w.render(context)}</LazyWidget>
                    </ChartErrorBoundary>,
                  )}
                </FullChartRow>,
              )
            } else {
              halfBuffer.push(w)
              if (halfBuffer.length === 2) flushHalves()
            }
          })
          flushHalves()

          return <>{elements}</>
        })()}

      {/* Settings Panel */}
      {showSettings && (
        <WidgetSettingsPanel
          title={settingsTitle}
          registry={registry as readonly WidgetDef<unknown>[]}
          activeIds={widgetIds}
          defaultIds={[...defaultWidgetIds]}
          onApply={handleApplyLayout}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
