import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import { useCalculation, useStoreSelection, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { useExport } from '@/application/hooks/useExport'
import { PageWidgetContainer } from '@/presentation/components/widgets'
import { ReportHeader, ReportDate, EmptyState, ExportBar, ExportButton } from './ReportsPage.styles'
import { REPORTS_WIDGET_CONFIG } from './widgets'
import type { ReportsWidgetContext } from './widgets'

export function ReportsPage() {
  const { isComputing, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores, isAllStores, selectedStoreIds } =
    useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const { exportDailySalesReport, exportMonthlyPLReport, exportStoreKpiReport } = useExport()

  // 部門KPIインデックス（Application層フック経由）
  const deptKpiIndex = useDeptKpiView()

  // 指標説明
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  // CSV エクスポートハンドラ
  const handleExportDaily = useCallback(() => {
    if (!currentResult) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportDailySalesReport(currentResult, store, settings.targetYear, settings.targetMonth)
  }, [
    currentResult,
    isAllStores,
    selectedStoreIds,
    stores,
    settings.targetYear,
    settings.targetMonth,
    exportDailySalesReport,
  ])

  const handleExportPL = useCallback(() => {
    if (!currentResult) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportMonthlyPLReport(currentResult, store, settings.targetYear, settings.targetMonth)
  }, [
    currentResult,
    isAllStores,
    selectedStoreIds,
    stores,
    settings.targetYear,
    settings.targetMonth,
    exportMonthlyPLReport,
  ])

  const handleExportStoreKpi = useCallback(() => {
    const storeResults = new Map<string, (typeof selectedResults)[number]>()
    for (const r of selectedResults) {
      storeResults.set(r.storeId, r)
    }
    exportStoreKpiReport(storeResults, stores, settings.targetYear, settings.targetMonth)
  }, [selectedResults, stores, settings.targetYear, settings.targetMonth, exportStoreKpiReport])

  if (isComputing && !currentResult) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const today = new Date()
  const reportDate = `${settings.targetYear}年${settings.targetMonth}月${today.getDate()}日`

  const widgetCtx: ReportsWidgetContext = {
    result: currentResult,
    settings,
    daysInMonth,
    deptKpiIndex,
    onExplain: handleExplain,
  }

  // レポートヘッダーとエクスポートバーはウィジェットの外に固定表示
  const headerContent = (
    <>
      <ReportHeader>
        <div />
        <ReportDate>{reportDate} 現在</ReportDate>
      </ReportHeader>
    </>
  )

  return (
    <MainContent title="月次レポート" storeName={storeName}>
      <PageWidgetContainer
        config={REPORTS_WIDGET_CONFIG}
        context={widgetCtx}
        headerContent={headerContent}
      />

      {/* CSVエクスポート */}
      <ExportBar>
        <ExportButton onClick={handleExportDaily}>&#128196; 日別売上CSV</ExportButton>
        <ExportButton onClick={handleExportPL}>&#128200; 月次P&amp;L CSV</ExportButton>
        {selectedResults.length > 1 && (
          <ExportButton onClick={handleExportStoreKpi}>&#127970; 店舗別KPI CSV</ExportButton>
        )}
      </ExportBar>

      {/* 指標説明パネル */}
      {explainMetric && explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={explanations.get(explainMetric)!}
          allExplanations={explanations}
          stores={dataStores}
          onClose={() => setExplainMetric(null)}
        />
      )}
    </MainContent>
  )
}
