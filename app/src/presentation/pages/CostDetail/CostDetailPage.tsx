import { useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import type { Store } from '@/domain/models/Store'
import { useDataStore } from '@/application/stores/dataStore'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { EmptyState } from './CostDetailPage.styles'
import { useCostDetailData } from '@/features/cost-detail'
import { DEFAULT_COST_DETAIL_WIDGET_IDS } from './widgets'

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

const COST_DETAIL_CONFIG: PageWidgetConfig = {
  pageKey: 'costDetail',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_COST_DETAIL_WIDGET_IDS,
  settingsTitle: '原価明細のカスタマイズ',
}

export function CostDetailPage() {
  const dataStores = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
  const costDetailData = useCostDetailData()
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  const enrichedCtx = useMemo(
    () => (ctx ? { ...ctx, costDetailData } : null),
    [ctx, costDetailData],
  )

  if (isComputing && !enrichedCtx) {
    return (
      <MainContent title="原価明細" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!enrichedCtx) {
    return (
      <MainContent title="原価明細" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  return (
    <MainContent title="原価明細" storeName={storeName}>
      <PageWidgetContainer config={COST_DETAIL_CONFIG} context={enrichedCtx} />

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
