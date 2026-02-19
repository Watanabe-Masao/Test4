import { useState, useCallback, useRef, type ReactNode } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, usePrevYearData, useStoreSelection } from '@/application/hooks'
import { useAppState } from '@/application/context'
import type { WidgetDef, WidgetContext } from './widgets/types'
import { WIDGET_MAP, loadLayout, saveLayout } from './widgets/registry'
import { WidgetSettingsPanel } from './WidgetSettingsPanel'
import {
  Section, SectionTitle, EmptyState, EmptyIcon, EmptyTitle,
  Toolbar, WidgetGridStyled, ChartRow, FullChartRow,
  DragItem, DragHandle,
} from './DashboardPage.styles'

// ─── Main Dashboard ──────────────────────────────────────

export function DashboardPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores, selectedStoreIds } = useStoreSelection()
  const appState = useAppState()
  const prevYear = usePrevYearData(currentResult?.elapsedDays)

  const [widgetIds, setWidgetIds] = useState<string[]>(loadLayout)
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

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

  // ─── Empty / Loading states ──

  if (!isCalculated) {
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
  const budgetChartData: { day: number; actualCum: number; budgetCum: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    budgetChartData.push({ day: d, actualCum: cumActual, budgetCum: cumBudget })
  }

  const ctx: WidgetContext = {
    result: r,
    daysInMonth,
    targetRate: appState.settings.targetGrossProfitRate,
    warningRate: appState.settings.warningThreshold,
    year: appState.settings.targetYear,
    month: appState.settings.targetMonth,
    budgetChartData,
    storeKey: storeName,
    prevYear,
    allStoreResults: appState.storeResults,
    stores: appState.data.stores,
    categoryTimeSales: appState.data.categoryTimeSales,
    selectedStoreIds,
  }

  // Resolve active widgets
  const activeWidgets = widgetIds
    .map((id) => WIDGET_MAP.get(id))
    .filter((w): w is WidgetDef => w != null)

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
        <DragHandle>⠿</DragHandle>
        {content}
      </DragItem>
    )
  }

  return (
    <MainContent title="ダッシュボード" storeName={storeName}>
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
                {renderDraggable(halfBuffer[0], idx1, halfBuffer[0].render(ctx))}
                {renderDraggable(halfBuffer[1], idx2, halfBuffer[1].render(ctx))}
              </ChartRow>,
            )
          } else {
            const idx1 = flatIdx++
            elements.push(
              <ChartRow key={`half-${halfBuffer[0].id}`}>
                {renderDraggable(halfBuffer[0], idx1, halfBuffer[0].render(ctx))}
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
                {renderDraggable(w, idx, w.render(ctx))}
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
  )
}
