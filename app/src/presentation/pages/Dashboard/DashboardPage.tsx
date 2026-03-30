import { useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { KpiCard, KpiGrid, MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { useStoreSelection } from '@/application/hooks/ui'
import type { ViewType } from '@/domain/models/storeTypes'
import { VIEW_TO_PATH } from '@/application/navigation/viewMapping'
import { palette } from '@/presentation/theme/tokens'
import { useDataStore } from '@/application/stores/dataStore'
import {
  CategoryHierarchyProvider,
  CurrencyUnitToggle,
  CrossChartSelectionProvider,
} from '@/presentation/components/charts'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { PrevYearBudgetDetailPanel } from './widgets/PrevYearBudgetDetailPanel'
import { useWidgetDragDrop } from './useWidgetDragDrop'
import { useDashboardLayout } from './useDashboardLayout'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'
import { DrillThroughScrollHandler } from './DrillThroughScrollHandler'
import { DashboardChartGrid } from './DashboardChartGrid'
import {
  Section,
  SectionTitle,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  Toolbar,
  WidgetGridStyled,
  DragItem,
  DragHandle,
  DeleteBtn,
  WidgetLinkBtn,
  WidgetWrapper,
} from './DashboardPage.styles'

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

  const {
    widgetIds,
    setWidgetIds,
    activeWidgets,
    kpiWidgets,
    chartWidgets,
    handleApplyLayout,
    handleRemoveWidget,
  } = useDashboardLayout({
    ctx,
    prevYearHasPrevYear: ctx?.prevYear.hasPrevYear ?? false,
    storeCount: stores.size,
    hasDiscountData: ctx?.result.hasDiscountData,
    isDuckDBReady: ctx?.queryExecutor?.isReady === true,
  })

  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // D&D state & handlers (extracted to useWidgetDragDrop)
  const { dragIndex, overIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useWidgetDragDrop(setWidgetIds)

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

  const renderDraggable = (
    widget: { id: string; linkTo?: { view: ViewType; tab?: string } },
    index: number,
    content: ReactNode,
  ) => {
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
              {kpiWidgets.map((w, i) => renderDraggable(w, i, w.render(ctx)))}
            </WidgetGridStyled>
          )}

          {/* Chart Widgets */}
          {chartWidgets.length > 0 && (
            <DashboardChartGrid
              chartWidgets={chartWidgets}
              ctx={ctx}
              flatIdxStart={kpiWidgets.length}
              renderWidget={renderDraggable}
            />
          )}

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
                prevDowDailyAvgCustomers: [0, 0, 0, 0, 0, 0, 0],
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
