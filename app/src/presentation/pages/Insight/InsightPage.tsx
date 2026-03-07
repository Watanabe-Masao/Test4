import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import { useCalculation, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { PageWidgetContainer } from '@/presentation/components/widgets'
import { EmptyState } from './InsightPage.styles'
import { useInsightData } from './useInsightData'
import { INSIGHT_WIDGET_CONFIG } from './widgets'
import type { InsightWidgetContext } from './widgets'

export function InsightPage() {
  const { isComputing } = useCalculation()
  const d = useInsightData()
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  if (isComputing && !d.currentResult) {
    return (
      <MainContent title="インサイト" storeName={d.storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!d.currentResult) {
    return (
      <MainContent title="インサイト" storeName={d.storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = d.currentResult

  const widgetCtx: InsightWidgetContext = {
    d,
    r,
    onExplain: handleExplain,
  }

  return (
    <MainContent title="インサイト" storeName={d.storeName}>
      <PageWidgetContainer config={INSIGHT_WIDGET_CONFIG} context={widgetCtx} />

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
