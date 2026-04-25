/**
 * ページ横断ウィジェットコンテナ
 *
 * 各ページに組み込むことで、ウィジェットの表示・並べ替え・
 * 設定UIを統一的に提供する。
 *
 * DuckDB 依存ウィジェット（size !== 'kpi'）は queryExecutor の readiness を
 * チェックし、未準備の場合は ChartSkeleton を表示する。
 * @responsibility R:widget
 */
import { useState, useCallback, useRef, memo, type ReactNode } from 'react'
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'
import type {
  UnifiedWidgetDef,
  PageWidgetConfig,
  UnifiedWidgetContext,
  RenderUnifiedWidgetContext,
} from './types'
import { narrowRenderCtx } from './widgetContextNarrow'
import { loadPageLayout, savePageLayout, buildWidgetMap } from './widgetLayout'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'
import {
  Toolbar,
  WidgetGridStyled,
  ChartRow,
  FullChartRow,
  DragItem,
  DragHandle,
  DeleteBtn,
  WidgetWrapper,
  EmptyState,
  EmptyTitle,
  LazyPlaceholder,
} from './PageWidgetContainer.styles'

// ─── DuckDB ウィジェットコンテンツガード ────────────────

/**
 * DuckDB 依存ウィジェット（size !== 'kpi'）の描画前に
 * queryExecutor の readiness をチェックし、未準備ならスケルトンを表示する。
 *
 * ウィジェット内部の query hook による個別ローディングは引き続き機能するが、
 * DuckDB エンジン自体が未初期化の段階ではウィジェット内部の hook が実行できないため、
 * この層で先にガードする。
 *
 * ADR-A-004 PR3: 引数 `context` は dispatch chokepoint で narrow 済の
 * `RenderUnifiedWidgetContext`。
 */
function renderWidgetWithGuard(
  widget: UnifiedWidgetDef,
  context: RenderUnifiedWidgetContext,
): ReactNode {
  // KPI ウィジェットは同期計算結果のためガード不要
  if (widget.size === 'kpi') {
    return widget.render(context)
  }

  // DuckDB 未準備の場合はスケルトンを表示
  if (!context.queryExecutor || context.queryExecutor.isReady !== true) {
    return <ChartSkeleton />
  }

  return widget.render(context)
}

// ─── Lazy Widget ────────────────────────────────────────

const LazyWidget = memo(function LazyWidget({ children }: { children: ReactNode }) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: '200px',
    freezeOnceVisible: true,
  })

  return <div ref={ref}>{hasBeenVisible ? children : <LazyPlaceholder />}</div>
})

// ─── Component ──────────────────────────────────────────

interface Props {
  /** ページウィジェット設定 */
  readonly config: PageWidgetConfig
  /** ウィジェットに渡すコンテキスト */
  readonly context: UnifiedWidgetContext
  /** ツールバーに追加する要素（CurrencyUnitToggle など） */
  readonly toolbarExtra?: ReactNode
  /** ウィジェット外のページ固有コンテンツ（ウィジェットの前に表示） */
  readonly headerContent?: ReactNode
}

export function PageWidgetContainer({ config, context, toolbarExtra, headerContent }: Props) {
  const { pageKey, registry, defaultWidgetIds, settingsTitle } = config
  const widgetMap = buildWidgetMap(registry)

  const [widgetIds, setWidgetIds] = useState<string[]>(() =>
    loadPageLayout(pageKey, registry, defaultWidgetIds),
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

  // ADR-A-004 PR3: dispatch chokepoint — slice を render-time に narrow。
  // narrow に失敗（slice が empty）したら widget 描画は skip。
  const renderCtx = narrowRenderCtx(context)

  const activeWidgets = renderCtx
    ? widgetIds
        .map((id) => widgetMap.get(id))
        .filter((w): w is UnifiedWidgetDef => w != null)
        .filter((w) => (w.isVisible ? w.isVisible(renderCtx) : true))
    : []

  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  let flatIdx = 0

  const renderDraggable = (widget: UnifiedWidgetDef, index: number, content: ReactNode) => {
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
            return renderDraggable(w, idx, w.render(renderCtx!))
          })}
        </WidgetGridStyled>
      )}

      {/* Chart / Full / Half Widgets */}
      {chartWidgets.length > 0 &&
        (() => {
          const elements: ReactNode[] = []
          let halfBuffer: UnifiedWidgetDef[] = []

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
                      <LazyWidget>{renderWidgetWithGuard(halfBuffer[0], renderCtx!)}</LazyWidget>
                    </ChartErrorBoundary>,
                  )}
                  {renderDraggable(
                    halfBuffer[1],
                    idx2,
                    <ChartErrorBoundary>
                      <LazyWidget>{renderWidgetWithGuard(halfBuffer[1], renderCtx!)}</LazyWidget>
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
                      <LazyWidget>{renderWidgetWithGuard(halfBuffer[0], renderCtx!)}</LazyWidget>
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
                      <LazyWidget>{renderWidgetWithGuard(w, renderCtx!)}</LazyWidget>
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
          registry={registry}
          activeIds={widgetIds}
          defaultIds={[...defaultWidgetIds]}
          onApply={handleApplyLayout}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
