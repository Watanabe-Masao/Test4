import { useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { useDataStore } from '@/application/stores/dataStore'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { EmptyState } from './InsightPage.styles'
import { useInsightData } from './useInsightData'
import { DEFAULT_INSIGHT_WIDGET_IDS } from './widgets'

const INSIGHT_CONFIG: PageWidgetConfig = {
  pageKey: 'insight',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_INSIGHT_WIDGET_IDS,
  settingsTitle: 'インサイトのカスタマイズ',
}

export function InsightPage() {
  const dataStores = useDataStore((s) => s.data.stores)
  const insightData = useInsightData()
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  // insightData を統一コンテキストに注入
  const enrichedCtx = useMemo(() => (ctx ? { ...ctx, insightData } : null), [ctx, insightData])

  if (isComputing && !enrichedCtx) {
    return (
      <MainContent title="インサイト" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!enrichedCtx) {
    return (
      <MainContent title="インサイト" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  return (
    <MainContent title="インサイト" storeName={storeName}>
      <PageWidgetContainer config={INSIGHT_CONFIG} context={enrichedCtx} />

      {explainMetric && enrichedCtx.explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={enrichedCtx.explanations.get(explainMetric)!}
          allExplanations={enrichedCtx.explanations}
          stores={dataStores}
          onClose={handleExplainClose}
        />
      )}
    </MainContent>
  )
}
