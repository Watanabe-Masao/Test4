import { useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { useStoreSelection } from '@/application/hooks/ui'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { Store } from '@/domain/models/Store'
import { useExport } from '@/application/hooks/useExport'
import { storeResultData } from '@/domain/models/storeTypes'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { ReportHeader, ReportDate, EmptyState, ExportBar, ExportButton } from './ReportsPage.styles'
import { DEFAULT_REPORTS_WIDGET_IDS } from './widgets'

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

const REPORTS_CONFIG: PageWidgetConfig = {
  pageKey: 'reports',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_REPORTS_WIDGET_IDS,
  settingsTitle: '月次レポートのカスタマイズ',
}

export function ReportsPage() {
  const { selectedResults, stores, isAllStores, selectedStoreIds } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const dataStores = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
  const { exportDailySalesReport, exportMonthlyPLReport, exportStoreKpiReport } = useExport()
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  const handleExportDaily = useCallback(() => {
    if (!ctx) return
    // ADR-A-004 PR3: ctx.result は StoreResultSlice。slice helper で narrow。
    const result = storeResultData(ctx.result)
    if (!result) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportDailySalesReport(result, store, settings.targetYear, settings.targetMonth)
  }, [
    ctx,
    isAllStores,
    selectedStoreIds,
    stores,
    settings.targetYear,
    settings.targetMonth,
    exportDailySalesReport,
  ])

  const handleExportPL = useCallback(() => {
    if (!ctx) return
    // ADR-A-004 PR3: ctx.result は StoreResultSlice。slice helper で narrow。
    const result = storeResultData(ctx.result)
    if (!result) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportMonthlyPLReport(result, store, settings.targetYear, settings.targetMonth)
  }, [
    ctx,
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

  if (isComputing && !ctx) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!ctx) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const today = new Date()
  const reportDate = `${settings.targetYear}年${settings.targetMonth}月${today.getDate()}日`

  const headerContent = (
    <ReportHeader>
      <div />
      <ReportDate>{reportDate} 現在</ReportDate>
    </ReportHeader>
  )

  return (
    <MainContent title="月次レポート" storeName={storeName}>
      <PageWidgetContainer config={REPORTS_CONFIG} context={ctx} headerContent={headerContent} />

      <ExportBar>
        <ExportButton onClick={handleExportDaily}>&#128196; 日別売上CSV</ExportButton>
        <ExportButton onClick={handleExportPL}>&#128200; 月次P&amp;L CSV</ExportButton>
        {selectedResults.length > 1 && (
          <ExportButton onClick={handleExportStoreKpi}>&#127970; 店舗別KPI CSV</ExportButton>
        )}
      </ExportBar>

      {explainMetric && ctx.explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={ctx.explanations.get(explainMetric)!}
          allExplanations={ctx.explanations}
          stores={dataStores}
          onClose={handleExplainClose}
        />
      )}
    </MainContent>
  )
}
