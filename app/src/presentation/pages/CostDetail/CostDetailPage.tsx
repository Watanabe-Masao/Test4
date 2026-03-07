import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useCalculation, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { PageWidgetContainer } from '@/presentation/components/widgets'
import { EmptyState } from './CostDetailPage.styles'
import { useCostDetailData } from './useCostDetailData'
import { COST_DETAIL_WIDGET_CONFIG } from './widgets'
import type { CostDetailWidgetContext } from './widgets'

export function CostDetailPage() {
  const { isComputing } = useCalculation()
  const d = useCostDetailData()
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  if (isComputing && !d.currentResult) {
    return (
      <MainContent title="原価明細" storeName={d.storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!d.currentResult || !d.typeIn || !d.typeOut || !d.typeNet) {
    return (
      <MainContent title="原価明細" storeName={d.storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const widgetCtx: CostDetailWidgetContext = {
    d,
    onExplain: handleExplain,
  }

  return (
    <MainContent title="原価明細" storeName={d.storeName}>
      <PageWidgetContainer config={COST_DETAIL_WIDGET_CONFIG} context={widgetCtx} />

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
