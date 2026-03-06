import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import { useCalculation, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { TabBar, Tab, EmptyState } from './InsightPage.styles'
import { useInsightData } from './useInsightData'
import { BudgetTabContent, GrossProfitTabContent } from './InsightTabBudget'
import { ForecastTabContent, DecompositionTabContent } from './InsightTabForecast'

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

  return (
    <MainContent title="インサイト" storeName={d.storeName}>
      {/* タブバー — 問いの深さ順 */}
      <TabBar>
        <Tab $active={d.activeTab === 'budget'} onClick={() => d.setActiveTab('budget')}>
          予算と実績
        </Tab>
        <Tab $active={d.activeTab === 'grossProfit'} onClick={() => d.setActiveTab('grossProfit')}>
          損益構造
        </Tab>
        <Tab
          $active={d.activeTab === 'decomposition'}
          onClick={() => d.setActiveTab('decomposition')}
        >
          売上要因
        </Tab>
        <Tab $active={d.activeTab === 'forecast'} onClick={() => d.setActiveTab('forecast')}>
          予測・パターン
        </Tab>
      </TabBar>

      {d.activeTab === 'budget' && <BudgetTabContent d={d} r={r} onExplain={handleExplain} />}
      {d.activeTab === 'grossProfit' && (
        <GrossProfitTabContent d={d} r={r} onExplain={handleExplain} />
      )}
      {d.activeTab === 'forecast' && d.forecastData && (
        <ForecastTabContent d={d} r={r} onExplain={handleExplain} />
      )}
      {d.activeTab === 'decomposition' && d.customerData && d.forecastData && (
        <DecompositionTabContent d={d} />
      )}

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
