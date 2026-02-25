import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, Chip, ChipGroup, ChartErrorBoundary, MetricBreakdownPanel } from '@/presentation/components/common'
import { useCalculation, usePrevYearData, usePrevYearCategoryTimeSales, useStoreSelection, useAutoLoadPrevYear, useExplanations, useCategoryTimeSalesIndex, useCategoryTimeSalesIndexFromRecords } from '@/application/hooks'
import type { MetricId, DateRange } from '@/domain/models'
import { useAppState } from '@/application/context'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { CategoryHierarchyProvider, CurrencyUnitToggle } from '@/presentation/components/charts'
import type { WidgetDef, WidgetContext } from './widgets/types'
import { WIDGET_MAP, loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/registry'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'
import {
  Section, SectionTitle, EmptyState, EmptyIcon, EmptyTitle,
  Toolbar, WidgetGridStyled, ChartRow, FullChartRow,
  DragItem, DragHandle, DeleteBtn,
} from './DashboardPage.styles'

// ─── Main Dashboard ──────────────────────────────────────

export function DashboardPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores, selectedStoreIds } = useStoreSelection()
  const appState = useAppState()
  const prevYear = usePrevYearData(currentResult?.elapsedDays)
  const prevYearCTS = usePrevYearCategoryTimeSales()

  // 前年データが未ロードの場合、IndexedDB から自動取得
  useAutoLoadPrevYear()

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
  useEffect(() => {
    const injected = autoInjectDataWidgets(widgetIds, {
      ctsRecordCount: ctsIndex.recordCount,
      prevYearHasPrevYear: prevYearCTS.hasPrevYear,
      storeCount: stores.size,
    })
    if (injected) {
      setWidgetIds(injected)
      saveLayout(injected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctsIndex.recordCount, prevYearCTS.hasPrevYear, stores.size])

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
            <KpiCard label="店舗数" value={`${stores.size}店舗`} accent="#6366f1" />
          </KpiGrid>
        </Section>
      </MainContent>
    )
  }

  const r = currentResult

  // Build chart data
  const salesDaily = new Map<number, number>()
  for (const [d, rec] of r.daily) salesDaily.set(d, rec.sales)
  let cumActual = 0
  let cumBudget = 0
  let cumPrevYear = 0
  const budgetChartData: { day: number; actualCum: number; budgetCum: number; prevYearCum: number | null }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    cumPrevYear += prevYear.daily.get(d)?.sales ?? 0
    budgetChartData.push({
      day: d,
      actualCum: cumActual,
      budgetCum: cumBudget,
      prevYearCum: prevYear.hasPrevYear ? cumPrevYear : null,
    })
  }

  // ── 日付範囲の算出（チャート用フックに渡す） ──
  const targetYear = appState.settings.targetYear
  const targetMonth = appState.settings.targetMonth
  const effectiveEndDay = r.elapsedDays != null && r.elapsedDays > 0
    ? Math.min(r.elapsedDays, daysInMonth)
    : daysInMonth
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
    departmentKpi: appState.data.departmentKpi,
    explanations,
    onExplain: handleExplain,
  }

  // Resolve active widgets (isVisible でデータ有無をフィルタ)
  const activeWidgets = widgetIds
    .map((id) => WIDGET_MAP.get(id))
    .filter((w): w is WidgetDef => w != null)
    .filter((w) => w.isVisible ? w.isVisible(ctx) : true)

  // Split by type
  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  // Flat index tracker for D&D
  let flatIdx = 0

  const renderDraggable = (widget: WidgetDef, index: number, content: ReactNode) => {
    if (!editMode) return <div key={widget.id}>{content}</div>
    return (
      <DragItem
        key={widget.id}
        draggable
        $isDragging={dragIndex === index}
        $isOver={overIndex === index}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={() => handleDrop(index)}
        onDragEnd={handleDragEnd}
      >
        <DeleteBtn onClick={(e) => { e.stopPropagation(); handleRemoveWidget(widget.id) }} title="削除">×</DeleteBtn>
        <DragHandle>⠿</DragHandle>
        {content}
      </DragItem>
    )
  }

  return (
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
      {chartWidgets.length > 0 && (() => {
        const elements: ReactNode[] = []
        let halfBuffer: WidgetDef[] = []

        const flushHalves = () => {
          if (halfBuffer.length === 0) return
          if (halfBuffer.length === 2) {
            const idx1 = flatIdx++
            const idx2 = flatIdx++
            elements.push(
              <ChartRow key={`half-${halfBuffer[0].id}`}>
                {renderDraggable(halfBuffer[0], idx1, <ChartErrorBoundary>{halfBuffer[0].render(ctx)}</ChartErrorBoundary>)}
                {renderDraggable(halfBuffer[1], idx2, <ChartErrorBoundary>{halfBuffer[1].render(ctx)}</ChartErrorBoundary>)}
              </ChartRow>,
            )
          } else {
            const idx1 = flatIdx++
            elements.push(
              <ChartRow key={`half-${halfBuffer[0].id}`}>
                {renderDraggable(halfBuffer[0], idx1, <ChartErrorBoundary>{halfBuffer[0].render(ctx)}</ChartErrorBoundary>)}
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
                {renderDraggable(w, idx, <ChartErrorBoundary>{w.render(ctx)}</ChartErrorBoundary>)}
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
  )
}
