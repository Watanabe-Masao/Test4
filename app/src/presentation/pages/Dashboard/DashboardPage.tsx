import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  KpiCard,
  KpiGrid,
  Chip,
  ChipGroup,
  ChartErrorBoundary,
  MetricBreakdownPanel,
} from '@/presentation/components/common'
import {
  useCalculation,
  usePrevYearData,
  usePrevYearCategoryTimeSales,
  useStoreSelection,
  useAutoLoadPrevYear,
  useExplanations,
  useCategoryTimeSalesIndex,
  useCategoryTimeSalesIndexFromRecords,
  useBudgetChartData,
} from '@/application/hooks'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import {
  useMonthlyHistory,
  currentResultToMonthlyPoint,
  useMonthlyDataPoints,
} from '@/application/hooks/useMonthlyHistory'
import type { MetricId, DateRange } from '@/domain/models'
import { palette } from '@/presentation/theme/tokens'
import { useAppState } from '@/application/context'
import { useRepository } from '@/application/context/RepositoryContext'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { buildDepartmentKpiIndex } from '@/application/usecases/departmentKpi/indexBuilder'
import {
  CategoryHierarchyProvider,
  CurrencyUnitToggle,
  CrossChartSelectionProvider,
  useCrossChartSelection,
} from '@/presentation/components/charts'
import type { WidgetDef, WidgetContext } from './widgets/types'
import { WIDGET_MAP, loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/registry'
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

// ─── Main Dashboard ──────────────────────────────────────

export function DashboardPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores, selectedStoreIds } = useStoreSelection()
  const appState = useAppState()
  const prevYear = usePrevYearData(currentResult?.elapsedDays)
  const prevYearCTS = usePrevYearCategoryTimeSales()

  // 前年データが未ロードの場合、IndexedDB から自動取得
  useAutoLoadPrevYear()

  // 過去月データ（季節性分析用）
  const repo = useRepository()
  const targetYear = appState.settings.targetYear
  const targetMonth = appState.settings.targetMonth
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

  // 販売データ存在範囲の検出（スライダーデフォルト値用）
  const dataMaxDay = useMemo(() => detectDataMaxDay(appState.data), [appState.data])

  // インデックス構築（データ変更時のみ再構築）
  const ctsIndex = useCategoryTimeSalesIndex(appState.data.categoryTimeSales)
  const prevCtsIndex = useCategoryTimeSalesIndexFromRecords(prevYearCTS.records)

  const [widgetIds, setWidgetIds] = useState<string[]>(loadLayout)
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // データ駆動ウィジェットの自動注入
  const widgetIdsRef = useRef(widgetIds)
  widgetIdsRef.current = widgetIds
  useEffect(() => {
    const injected = autoInjectDataWidgets(widgetIdsRef.current, {
      ctsRecordCount: ctsIndex.recordCount,
      prevYearHasPrevYear: prevYearCTS.hasPrevYear,
      storeCount: stores.size,
      hasDiscountData: currentResult?.hasDiscountData,
    })
    if (injected) {
      setWidgetIds(injected)
      saveLayout(injected)
    }
  }, [ctsIndex.recordCount, prevYearCTS.hasPrevYear, stores.size, currentResult?.hasDiscountData])

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

  // 部門KPIインデックス（早期リターン前に呼ぶ: hooks の呼び出し順序維持）
  const deptKpiIndex = useMemo(
    () => buildDepartmentKpiIndex(appState.data.departmentKpi),
    [appState.data.departmentKpi],
  )

  // 予算 vs 実績 累計チャートデータ（早期リターン前に呼ぶ: hooks の呼び出し順序維持）
  const budgetChartData = useBudgetChartData(currentResult, daysInMonth, prevYear)

  // DuckDB エンジン初期化 + データロード（早期リターン前に呼ぶ: hooks の呼び出し順序維持）
  const duck = useDuckDB(appState.data, targetYear, targetMonth)

  // ─── Empty / Loading states ──

  if (!isCalculated && appState.storeResults.size === 0) {
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
  const prevYearDateRange: DateRange | undefined = prevYear.hasPrevYear
    ? {
        from: { year: targetYear - 1, month: targetMonth, day: 1 },
        to: { year: targetYear - 1, month: targetMonth, day: effectiveEndDay },
      }
    : undefined

  const ctx: WidgetContext = {
    result: r,
    daysInMonth,
    targetRate: appState.settings.targetGrossProfitRate,
    warningRate: appState.settings.warningThreshold,
    year: targetYear,
    month: targetMonth,
    budgetChartData,
    storeKey: storeName,
    prevYear,
    allStoreResults: appState.storeResults,
    stores: appState.data.stores,
    ctsIndex,
    prevCtsIndex,
    currentDateRange,
    prevYearDateRange,
    selectedStoreIds,
    dataEndDay: appState.settings.dataEndDay,
    dataMaxDay,
    elapsedDays: r.elapsedDays,
    departmentKpi: deptKpiIndex,
    explanations,
    onExplain: handleExplain,
    monthlyHistory,
    duckConn: duck.conn,
    duckDataVersion: duck.dataVersion,
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
        <div key={widget.id} data-widget-id={widget.id}>
          {content}
        </div>
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
                        <ChartErrorBoundary>{halfBuffer[0].render(ctx)}</ChartErrorBoundary>,
                      )}
                      {renderDraggable(
                        halfBuffer[1],
                        idx2,
                        <ChartErrorBoundary>{halfBuffer[1].render(ctx)}</ChartErrorBoundary>,
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
                        <ChartErrorBoundary>{halfBuffer[0].render(ctx)}</ChartErrorBoundary>,
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
                        <ChartErrorBoundary>{w.render(ctx)}</ChartErrorBoundary>,
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
            stores={appState.data.stores}
            onClose={() => setExplainMetric(null)}
          />
        )}
      </CategoryHierarchyProvider>
    </CrossChartSelectionProvider>
  )
}
