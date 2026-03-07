import { useState, useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import {
  useCalculation,
  useStoreSelection,
  useSettings,
  useExplanations,
} from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId, CustomCategory } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { EmptyState } from './CategoryPage.styles'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { PageWidgetContainer } from '@/presentation/components/widgets'
import { CATEGORY_WIDGET_CONFIG } from './widgets'
import type { CategoryWidgetContext } from './widgets'

export function CategoryPage() {
  const { isComputing } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const { updateSettings } = useSettings()
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  // Build store name map for comparison charts (must be before early return)
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  if (isComputing && !currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const hasMultipleStores = selectedResults.length > 1

  const handleCustomCategoryChange = (supplierCode: string, value: string) => {
    if (!value || value === 'uncategorized') {
      const next = Object.fromEntries(
        Object.entries(settings.supplierCategoryMap).filter(([k]) => k !== supplierCode),
      )
      updateSettings({ supplierCategoryMap: next })
    } else {
      updateSettings({
        supplierCategoryMap: {
          ...settings.supplierCategoryMap,
          [supplierCode]: value as CustomCategory,
        },
      })
    }
  }

  const widgetCtx: CategoryWidgetContext = {
    r,
    selectedResults,
    stores,
    storeNames,
    settings,
    onExplain: handleExplain,
    onCustomCategoryChange: handleCustomCategoryChange,
    hasMultipleStores,
  }

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      <PageWidgetContainer
        config={CATEGORY_WIDGET_CONFIG}
        context={widgetCtx}
        toolbarExtra={<CurrencyUnitToggle />}
      />

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
