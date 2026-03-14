import { useState, useCallback, useRef, useEffect, memo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/presentation/components/Layout'
import {
  KpiCard,
  KpiGrid,
  Chip,
  ChipGroup,
  ChartErrorBoundary,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useStoreSelection } from '@/application/hooks'
import type { ViewType } from '@/domain/models'
import { VIEW_TO_PATH } from '@/application/navigation/viewMapping'
import { palette } from '@/presentation/theme/tokens'
import { useDataStore } from '@/application/stores/dataStore'
import {
  CategoryHierarchyProvider,
  CurrencyUnitToggle,
  CrossChartSelectionProvider,
  useCrossChartSelection,
} from '@/presentation/components/charts'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'
import { UNIFIED_WIDGET_MAP } from '@/presentation/components/widgets'
import type { WidgetDef } from '@/presentation/components/widgets'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { PrevYearBudgetDetailPanel } from './widgets/PrevYearBudgetDetailPanel'
import { loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/widgetLayout'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'
import {
  Section,
  SectionTitle,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  Toolbar,
  WidgetGridStyled,
  ChartRow,
  FullChartRow,
  DragItem,
  DragHandle,
  DeleteBtn,
  WidgetLinkBtn,
  WidgetWrapper,
} from './DashboardPage.styles'

// ─── Drill-through scroll handler ────────────────────────

/** CrossChartSelectionContext のドリルスルーリクエストに応じて対象ウィジェットへスクロール */
function DrillThroughScrollHandler() {
  const { drillThroughTarget, requestDrillThrough } = useCrossChartSelection()

  useEffect(() => {
    if (!drillThroughTarget) return
    const el = document.querySelector(`[data-widget-id="${drillThroughTarget.widgetId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // ハイライトアニメーション
      el.classList.add('drill-highlight')
      const timer = setTimeout(() => {
        el.classList.remove('drill-highlight')
        requestDrillThrough(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
    requestDrillThrough(null)
  }, [drillThroughTarget, requestDrillThrough])

  return null
}

// ─── Lazy Widget (遅延レンダリング) ─────────────────────

/** チャートウィジェットをビューポートに入るまでプレースホルダーで表示する */
const LazyWidget = memo(function LazyWidget({ children }: { children: ReactNode }) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: '200px',
    freezeOnceVisible: true,
  })

  return <div ref={ref}>{hasBeenVisible ? children : <div style={{ minHeight: 300 }} />}</div>
})

// ─── Main Dashboard ──────────────────────────────────────

export function DashboardPage() {
  const nav = useNavigate()
  const { stores } = useStoreSelection()
  const storeResults = useDataStore((s) => s.storeResults)
  const dataStores = useDataStore((s) => s.data.stores)

  const {
    ctx,
    isComputing,
    isCalculated,
    storeName,
    explainMetric,
    setExplainMetric,
    prevYearDetailType,
    setPrevYearDetailType,
  } = useUnifiedWidgetContext()

  const [widgetIds, setWidgetIds] = useState<string[]>(loadLayout)
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const widgetIdsRef = useRef(widgetIds)
  widgetIdsRef.current = widgetIds

  // D&D state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleApplyLayout = useCallback((ids: string[]) => {
    setWidgetIds(ids)
    saveLayout(ids)
  }, [])

  // D&D handlers
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback((targetIndex: number) => {
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
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgetIds((prev) => {
      const next = prev.filter((id) => id !== widgetId)
      saveLayout(next)
      return next
    })
  }, [])

  // データ駆動ウィジェットの自動注入
  useEffect(() => {
    const injected = autoInjectDataWidgets(widgetIdsRef.current, {
      prevYearHasPrevYear: ctx?.prevYear.hasPrevYear ?? false,
      storeCount: stores.size,
      hasDiscountData: ctx?.result.hasDiscountData,
      isDuckDBReady: (ctx?.duckConn ?? null) != null,
    })
    if (injected) {
      setWidgetIds(injected)
      saveLayout(injected)
    }
  }, [ctx?.prevYear.hasPrevYear, stores.size, ctx?.result.hasDiscountData, ctx?.duckConn])

  const handleWidgetLink = useCallback(
    (view: ViewType, tab?: string) => {
      const path = VIEW_TO_PATH[view] + (tab ? `?tab=${tab}` : '')
      nav(path)
    },
    [nav],
  )

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  // ─── Empty / Loading states ──

  if (isComputing && storeResults.size === 0) {
    return (
      <MainContent title="ダッシュボード">
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!isCalculated && storeResults.size === 0) {
    return (
      <MainContent title="ダッシュボード">
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyTitle>データを読み込んでください</EmptyTitle>
          <p>左のサイドバーからファイルをドラッグ＆ドロップすると自動で計算されます。</p>
        </EmptyState>
      </MainContent>
    )
  }

  if (!ctx) {
    return (
      <MainContent title="ダッシュボード" storeName={storeName}>
        <Section>
          <SectionTitle>全店舗概要</SectionTitle>
          <KpiGrid>
            <KpiCard label="店舗数" value={`${stores.size}店舗`} accent={palette.primary} />
          </KpiGrid>
        </Section>
      </MainContent>
    )
  }

  // Resolve active widgets (isVisible でデータ有無をフィルタ)
  const activeWidgets = widgetIds
    .map((id) => UNIFIED_WIDGET_MAP.get(id))
    .filter((w): w is WidgetDef => w != null)
    .filter((w) => (w.isVisible ? w.isVisible(ctx) : true))

  // Split by type
  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  // Flat index tracker for D&D
  let flatIdx = 0

  const renderDraggable = (widget: WidgetDef, index: number, content: ReactNode) => {
    if (!editMode)
      return (
        <WidgetWrapper key={widget.id} data-widget-id={widget.id}>
          {content}
          {widget.linkTo && (
            <WidgetLinkBtn
              onClick={() => handleWidgetLink(widget.linkTo!.view, widget.linkTo!.tab)}
              title="詳細ページへ"
            >
              詳しく →
            </WidgetLinkBtn>
          )}
        </WidgetWrapper>
      )
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
    <CrossChartSelectionProvider>
      <DrillThroughScrollHandler />
      <CategoryHierarchyProvider>
        <MainContent title="ダッシュボード" storeName={storeName} actions={<CurrencyUnitToggle />}>
          <Toolbar>
            <ChipGroup>
              <Chip $active={editMode} onClick={() => setEditMode(!editMode)}>
                {editMode ? '編集完了' : '並べ替え'}
              </Chip>
              <Chip $active={false} onClick={() => setShowSettings(true)}>
                ウィジェット設定
              </Chip>
            </ChipGroup>
          </Toolbar>

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
                return renderDraggable(w, idx, w.render(ctx))
              })}
            </WidgetGridStyled>
          )}

          {/* Chart Widgets */}
          {chartWidgets.length > 0 &&
            (() => {
              const elements: ReactNode[] = []
              let halfBuffer: WidgetDef[] = []

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
                          <LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget>
                        </ChartErrorBoundary>,
                      )}
                      {renderDraggable(
                        halfBuffer[1],
                        idx2,
                        <ChartErrorBoundary>
                          <LazyWidget>{halfBuffer[1].render(ctx)}</LazyWidget>
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
                          <LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget>
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
                          <LazyWidget>{w.render(ctx)}</LazyWidget>
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
              activeIds={widgetIds}
              onApply={handleApplyLayout}
              onClose={() => setShowSettings(false)}
            />
          )}
        </MainContent>

        {/* 指標説明パネル */}
        {explainMetric && ctx.explanations.has(explainMetric) && (
          <MetricBreakdownPanel
            explanation={ctx.explanations.get(explainMetric)!}
            allExplanations={ctx.explanations}
            stores={dataStores}
            onClose={handleExplainClose}
          />
        )}

        {/* 前年予算比較詳細パネル */}
        {prevYearDetailType && ctx.prevYearMonthlyKpi?.hasPrevYear && (
          <PrevYearBudgetDetailPanel
            type={prevYearDetailType}
            entry={
              prevYearDetailType === 'sameDow'
                ? ctx.prevYearMonthlyKpi.sameDow
                : ctx.prevYearMonthlyKpi.sameDate
            }
            budgetDaily={ctx.result.budgetDaily}
            budgetTotal={ctx.result.budget}
            targetYear={ctx.year}
            targetMonth={ctx.month}
            sourceYear={ctx.prevYearMonthlyKpi.sourceYear}
            sourceMonth={ctx.prevYearMonthlyKpi.sourceMonth}
            dowOffset={ctx.prevYearMonthlyKpi.dowOffset}
            dowGap={
              ctx.dowGap ?? {
                dowCounts: [],
                estimatedImpact: 0,
                isValid: false,
                prevDowDailyAvg: [0, 0, 0, 0, 0, 0, 0],
                hasPrevDowSales: false,
                isSameStructure: true,
                missingDataWarnings: [],
              }
            }
            onClose={() => setPrevYearDetailType(null)}
          />
        )}
      </CategoryHierarchyProvider>
    </CrossChartSelectionProvider>
  )
}
