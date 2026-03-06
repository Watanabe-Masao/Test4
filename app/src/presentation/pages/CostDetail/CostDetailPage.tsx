import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  KpiCard,
  KpiGrid,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useCalculation, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { palette } from '@/presentation/theme/tokens'
import { TabBar, Tab, EmptyState } from './CostDetailPage.styles'
import { useCostDetailData } from './useCostDetailData'
import { TransferTab } from './TransferTab'
import { CostInclusionTab } from './CostInclusionTab'
import { PurchaseTab } from './PurchaseTab'

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

  return (
    <MainContent title="原価明細" storeName={d.storeName}>
      {/* サマリーKPI（常に表示） */}
      <KpiGrid>
        <KpiCard
          label={`${d.typeLabel}入`}
          value={formatCurrency(d.typeIn.cost)}
          subText={`売価: ${formatCurrency(d.typeIn.price)}`}
          accent={palette.blueDark}
        />
        <KpiCard
          label={`${d.typeLabel}出`}
          value={formatCurrency(d.typeOut.cost)}
          subText={`売価: ${formatCurrency(d.typeOut.price)}`}
          accent={palette.dangerDark}
        />
        <KpiCard
          label="原価算入費合計"
          value={formatCurrency(d.totalCostInclusionAmount)}
          accent={palette.orange}
          onClick={() => handleExplain('totalCostInclusion')}
        />
        <KpiCard
          label="原価算入率"
          value={formatPercent(d.costInclusionRate)}
          subText={`売上高: ${formatCurrency(d.totalSales)}`}
          accent={palette.orangeDark}
          onClick={() => handleExplain('totalCostInclusion')}
        />
      </KpiGrid>

      {/* タブバー */}
      <TabBar>
        <Tab $active={d.activeTab === 'purchase'} onClick={() => d.setActiveTab('purchase')}>
          仕入
        </Tab>
        <Tab $active={d.activeTab === 'transfer'} onClick={() => d.setActiveTab('transfer')}>
          移動
        </Tab>
        <Tab
          $active={d.activeTab === 'costInclusion'}
          onClick={() => d.setActiveTab('costInclusion')}
        >
          消耗品
        </Tab>
      </TabBar>

      {d.activeTab === 'transfer' && <TransferTab d={d} />}
      {d.activeTab === 'costInclusion' && <CostInclusionTab d={d} onExplain={handleExplain} />}
      {d.activeTab === 'purchase' && <PurchaseTab d={d} />}

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
