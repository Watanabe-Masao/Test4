/**
 * @responsibility R:unclassified
 */

import { useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import type { Store } from '@/domain/models/Store'
import { useDataStore } from '@/application/stores/dataStore'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { EmptyState } from './InsightPage.styles'
import { useInsightData } from './useInsightData'
import { DEFAULT_INSIGHT_WIDGET_IDS } from './widgets'

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

const INSIGHT_CONFIG: PageWidgetConfig = {
  pageKey: 'insight',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_INSIGHT_WIDGET_IDS,
  settingsTitle: 'インサイトのカスタマイズ',
}

export function InsightPage() {
  const dataStores = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()
  const cf = ctx?.readModels?.customerFact
  const curCustomerCount = cf?.status === 'ready' ? cf.data.grandTotalCustomers : undefined
  const insightData = useInsightData({
    curCustomerCount,
    prevCustomerCount: undefined, // prevYear customerFact は未配布
  })

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
