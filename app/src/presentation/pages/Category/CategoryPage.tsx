import { useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { PageSkeleton } from '@/presentation/components/common/feedback'
import { MetricBreakdownPanel } from '@/presentation/components/common/tables'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useSettings } from '@/application/hooks/ui'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import type { CustomCategory } from '@/domain/models/storeTypes'
import { EmptyState } from './CategoryPage.styles'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { DEFAULT_CATEGORY_WIDGET_IDS } from './widgets'

const CATEGORY_CONFIG: PageWidgetConfig = {
  pageKey: 'category',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_CATEGORY_WIDGET_IDS,
  settingsTitle: 'カテゴリ分析のカスタマイズ',
}

export function CategoryPage() {
  const dataStores = useDataStore((s) => s.data.stores)
  const settings = useSettingsStore((s) => s.settings)
  const { updateSettings } = useSettings()
  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  const handleCustomCategoryChange = useCallback(
    (supplierCode: string, value: string) => {
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
    },
    [settings.supplierCategoryMap, updateSettings],
  )

  const enrichedCtx = useMemo(
    () => (ctx ? { ...ctx, onCustomCategoryChange: handleCustomCategoryChange } : null),
    [ctx, handleCustomCategoryChange],
  )

  if (isComputing && !enrichedCtx) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!enrichedCtx) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      <PageWidgetContainer
        config={CATEGORY_CONFIG}
        context={enrichedCtx}
        toolbarExtra={<CurrencyUnitToggle />}
      />

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
