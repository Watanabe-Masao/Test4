import { useState, useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Chip,
  ChipGroup,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import {
  useCalculation,
  useStoreSelection,
  useSettings,
  useExplanations,
} from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId, CustomCategory } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { ToggleBar, ToggleLabel, EmptyState } from './CategoryPage.styles'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import type { ComparisonMode } from './categoryData'
import { CategoryTotalView } from './CategoryTotalView'
import { CategoryComparisonView } from './CategoryComparisonView'

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
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('total')

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

  const showComparison = comparisonMode === 'comparison' && hasMultipleStores

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      <ToggleBar>
        <CurrencyUnitToggle />
      </ToggleBar>
      {hasMultipleStores && (
        <ToggleBar>
          <ToggleLabel>表示モード:</ToggleLabel>
          <ChipGroup>
            <Chip $active={comparisonMode === 'total'} onClick={() => setComparisonMode('total')}>
              合計モード
            </Chip>
            <Chip
              $active={comparisonMode === 'comparison'}
              onClick={() => setComparisonMode('comparison')}
            >
              店舗間比較モード
            </Chip>
          </ChipGroup>
        </ToggleBar>
      )}

      {!showComparison && (
        <CategoryTotalView
          r={r}
          selectedResults={selectedResults}
          stores={stores}
          settings={settings}
          onExplain={handleExplain}
          onCustomCategoryChange={handleCustomCategoryChange}
        />
      )}

      {showComparison && (
        <CategoryComparisonView selectedResults={selectedResults} storeNames={storeNames} />
      )}

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
