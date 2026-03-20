/**
 * L1 店別分析ページ
 *
 * ダッシュボードの「詳しく→」から遷移。
 * 店舗ごとの売上・粗利・構造指標を多角的に検証する。
 *
 * 階層: L0(ダッシュボード) → L1(本ページ) → L2(日別分析)
 */
import { useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { useDataStore } from '@/application/stores/dataStore'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { DEFAULT_STORE_ANALYSIS_WIDGET_IDS } from './widgets'

const STORE_ANALYSIS_CONFIG: PageWidgetConfig = {
  pageKey: 'storeAnalysis',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_STORE_ANALYSIS_WIDGET_IDS,
  settingsTitle: '店別分析のカスタマイズ',
}

export function StoreAnalysisPage() {
  const dataStores = useDataStore((s) => s.data.stores)
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  if (isComputing && !ctx) {
    return (
      <MainContent title="店別分析" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!ctx) {
    return (
      <MainContent title="店別分析" storeName={storeName}>
        <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>計算を実行してください</p>
      </MainContent>
    )
  }

  return (
    <MainContent title="店別分析" storeName={storeName}>
      <PageWidgetContainer
        config={STORE_ANALYSIS_CONFIG}
        context={ctx}
        toolbarExtra={<CurrencyUnitToggle />}
      />

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
