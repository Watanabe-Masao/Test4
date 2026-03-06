import { useState, useCallback, useRef, useEffect, useMemo, memo, type ReactNode } from 'react'
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
import {
  useCalculation,
  usePrevYearData,
  useStoreSelection,
  useAutoLoadPrevYear,
  useExplanations,
  useComparisonFrame,
  usePrevYearMonthlyKpi,
  useDowGapAnalysis,
} from '@/application/hooks'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import {
  useMonthlyHistory,
  currentResultToMonthlyPoint,
  useMonthlyDataPoints,
} from '@/application/hooks/useMonthlyHistory'
import type { MetricId, DateRange, ViewType } from '@/domain/models'
import { VIEW_TO_PATH } from '@/presentation/routes'
import { palette } from '@/presentation/theme/tokens'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useRepository } from '@/application/context/useRepository'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import {
  CategoryHierarchyProvider,
  CurrencyUnitToggle,
  CrossChartSelectionProvider,
  useCrossChartSelection,
} from '@/presentation/components/charts'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'
import { PrevYearBudgetDetailPanel } from './widgets/PrevYearBudgetDetailPanel'
import type { WidgetDef, WidgetContext } from './widgets/types'
import { WIDGET_MAP, loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/widgetLayout'
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
  const { isCalculated, isComputing, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores, selectedStoreIds } = useStoreSelection()
  const data = useDataStore((s) => s.data)
  const storeResults = useDataStore((s) => s.storeResults)
  const settings = useSettingsStore((s) => s.settings)
  const prevYear = usePrevYearData(currentResult?.elapsedDays)
  const prevYearMonthlyKpi = usePrevYearMonthlyKpi()

  // 前年の曜日別合計売上を算出（曜日ギャップ分析用）
  const prevDowSales = useMemo(() => {
    if (!prevYearMonthlyKpi.hasPrevYear) return undefined
    const srcYear = prevYearMonthlyKpi.sourceYear
    const srcMonth = prevYearMonthlyKpi.sourceMonth
    if (srcYear === 0) return undefined
    const sales = [0, 0, 0, 0, 0, 0, 0]
    for (const row of prevYearMonthlyKpi.sameDate.dailyMapping) {
      const dow = new Date(srcYear, srcMonth - 1, row.prevDay).getDay()
      sales[dow] += row.prevSales
    }
    return sales
  }, [prevYearMonthlyKpi])

  // 曜日ギャップ分析（前年予算比較パネル用）
  const dowGap = useDowGapAnalysis(
    settings.targetYear,
    settings.targetMonth,
    prevYearMonthlyKpi.sourceYear,
    prevYearMonthlyKpi.sourceMonth,
    currentResult?.averageDailySales ?? 0,
    prevYearMonthlyKpi.hasPrevYear,
    prevDowSales,
  )

  // 前年データが未ロードの場合、IndexedDB から自動取得
  useAutoLoadPrevYear()

  // 過去月データ（季節性分析用）
  const repo = useRepository()
  const targetYear = settings.targetYear
  const targetMonth = settings.targetMonth
  const historicalMonths = useMonthlyHistory(repo, targetYear, targetMonth)
  const currentMonthlyPoint = useMemo(() => {
    if (!currentResult) return null
    return currentResultToMonthlyPoint(targetYear, targetMonth, currentResult, stores.size)
  }, [currentResult, targetYear, targetMonth, stores.size])
  const monthlyHistory = useMonthlyDataPoints(
    historicalMonths,
    targetYear,
    targetMonth,
    currentMonthlyPoint,
  )

  // 指標説明
  const explanations = useExplanations()
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  // 前年予算比較詳細パネル
  const [prevYearDetailType, setPrevYearDetailType] = useState<'sameDow' | 'sameDate' | null>(null)
  const handlePrevYearDetail = useCallback((type: 'sameDow' | 'sameDate') => {
    setPrevYearDetailType(type)
  }, [])

  // 販売データ存在範囲の検出（スライダーデフォルト値用）
  const dataMaxDay = useMemo(() => detectDataMaxDay(data), [data])

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

  // 部門KPIインデックス（Application層フック経由。早期リターン前に呼ぶ: hooks の呼び出し順序維持）
  const deptKpiIndex = useDeptKpiView()

  // DuckDB エンジン初期化 + データロード（早期リターン前に呼ぶ: hooks の呼び出し順序維持）
  // repo を渡すことで IndexedDB の過去月データも自動ロードされ、月跨ぎクエリが可能になる
  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  // 比較フレーム（全チャート共通の前年期間決定）— hooks の呼び出し順序維持のため早期リターン前
  const baseRange: DateRange = useMemo(
    () => ({
      from: { year: targetYear, month: targetMonth, day: 1 },
      to: { year: targetYear, month: targetMonth, day: daysInMonth },
    }),
    [targetYear, targetMonth, daysInMonth],
  )
  const frame = useComparisonFrame(baseRange)

  // データ駆動ウィジェットの自動注入
  // duck.isReady を依存配列に含め、DuckDB 初期化完了時にも再注入を試みる
  useEffect(() => {
    const injected = autoInjectDataWidgets(widgetIdsRef.current, {
      prevYearHasPrevYear: prevYear.hasPrevYear,
      storeCount: stores.size,
      hasDiscountData: currentResult?.hasDiscountData,
      isDuckDBReady: duck.isReady,
    })
    if (injected) {
      setWidgetIds(injected)
      saveLayout(injected)
    }
  }, [prevYear.hasPrevYear, stores.size, currentResult?.hasDiscountData, duck.isReady])

  const handleWidgetLink = useCallback(
    (view: ViewType, tab?: string) => {
      const path = VIEW_TO_PATH[view] + (tab ? `?tab=${tab}` : '')
      useUiStore.getState().setCurrentView(view)
      nav(path)
    },
    [nav],
  )

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

  if (!currentResult) {
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

  const r = currentResult

  // ── 日付範囲の算出（チャート用フックに渡す） ──
  const effectiveEndDay =
    r.elapsedDays != null && r.elapsedDays > 0 ? Math.min(r.elapsedDays, daysInMonth) : daysInMonth

  const currentDateRange: DateRange = {
    from: { year: targetYear, month: targetMonth, day: 1 },
    to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
  }
  const prevYearDateRange: DateRange | undefined = prevYear.hasPrevYear ? frame.previous : undefined

  const ctx: WidgetContext = {
    result: r,
    daysInMonth,
    targetRate: settings.targetGrossProfitRate,
    warningRate: settings.warningThreshold,
    year: targetYear,
    month: targetMonth,
    storeKey: storeName,
    prevYear,
    prevYearMonthlyKpi,
    allStoreResults: storeResults,
    stores: data.stores,
    currentDateRange,
    prevYearDateRange,
    selectedStoreIds,
    dataEndDay: settings.dataEndDay,
    dataMaxDay,
    elapsedDays: r.elapsedDays,
    departmentKpi: deptKpiIndex,
    explanations,
    onExplain: handleExplain,
    monthlyHistory,
    duckConn: duck.conn,
    duckDataVersion: duck.dataVersion,
    duckLoadedMonthCount: duck.loadedMonthCount,
    comparisonFrame: frame,
    dowGap,
    onPrevYearDetail: handlePrevYearDetail,
  }

  // Resolve active widgets (isVisible でデータ有無をフィルタ)
  const activeWidgets = widgetIds
    .map((id) => WIDGET_MAP.get(id))
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
        <MainContent title="ダッシュボード" storeName={storeName}>
          <Toolbar>
            <CurrencyUnitToggle />
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
                        <ChartErrorBoundary><LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget></ChartErrorBoundary>,
                      )}
                      {renderDraggable(
                        halfBuffer[1],
                        idx2,
                        <ChartErrorBoundary><LazyWidget>{halfBuffer[1].render(ctx)}</LazyWidget></ChartErrorBoundary>,
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
                        <ChartErrorBoundary><LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget></ChartErrorBoundary>,
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
                        <ChartErrorBoundary><LazyWidget>{w.render(ctx)}</LazyWidget></ChartErrorBoundary>,
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
        {explainMetric && explanations.has(explainMetric) && (
          <MetricBreakdownPanel
            explanation={explanations.get(explainMetric)!}
            allExplanations={explanations}
            stores={data.stores}
            onClose={() => setExplainMetric(null)}
          />
        )}

        {/* 前年予算比較詳細パネル */}
        {prevYearDetailType && prevYearMonthlyKpi.hasPrevYear && (
          <PrevYearBudgetDetailPanel
            type={prevYearDetailType}
            entry={
              prevYearDetailType === 'sameDow'
                ? prevYearMonthlyKpi.sameDow
                : prevYearMonthlyKpi.sameDate
            }
            budgetDaily={r.budgetDaily}
            budgetTotal={r.budget}
            targetYear={targetYear}
            targetMonth={targetMonth}
            sourceYear={prevYearMonthlyKpi.sourceYear}
            sourceMonth={prevYearMonthlyKpi.sourceMonth}
            dowOffset={prevYearMonthlyKpi.dowOffset}
            dowGap={dowGap}
            onClose={() => setPrevYearDetailType(null)}
          />
        )}
      </CategoryHierarchyProvider>
    </CrossChartSelectionProvider>
  )
}
