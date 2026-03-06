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
import { safeDivide } from '@/domain/calculations/utils'
import { ToggleBar, ToggleLabel, EmptyState } from './CategoryPage.styles'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import type { ComparisonMode } from './categoryData'
import { CategoryTotalView } from './CategoryTotalView'
import { CategoryComparisonView } from './CategoryComparisonView'

type SortKey =
  | 'label'
  | 'cost'
  | 'price'
  | 'grossProfit'
  | 'markup'
  | 'costShare'
  | 'priceShare'
  | 'crossMult'
type SortDir = 'asc' | 'desc'

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
  const [supplierSort, setSupplierSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'cost',
    dir: 'desc',
  })
  const [supplierFilter, setSupplierFilter] = useState('')

  // Build store name map for comparison charts (must be before early return)
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  // Filtered + sorted supplier data (must be before early return)
  const filteredSupplierData = useMemo(() => {
    if (!currentResult) return []
    const supplierList = Array.from(currentResult.supplierTotals.values())
    const tAbsPrice = supplierList.reduce((sum, s) => sum + Math.abs(s.price), 0)
    const tPrice = supplierList.reduce((sum, s) => sum + s.price, 0)
    let list = supplierList
    if (supplierFilter) {
      const q = supplierFilter.toLowerCase()
      list = list.filter(
        (s) => s.supplierName.toLowerCase().includes(q) || s.supplierCode.includes(q),
      )
    }
    const { key, dir } = supplierSort
    const sorted = [...list].sort((a, b) => {
      let va: number, vb: number
      switch (key) {
        case 'cost':
          va = a.cost
          vb = b.cost
          break
        case 'price':
          va = a.price
          vb = b.price
          break
        case 'grossProfit':
          va = a.price - a.cost
          vb = b.price - b.cost
          break
        case 'markup':
          va = a.markupRate
          vb = b.markupRate
          break
        case 'priceShare':
          va = safeDivide(Math.abs(a.price), tAbsPrice, 0)
          vb = safeDivide(Math.abs(b.price), tAbsPrice, 0)
          break
        case 'crossMult':
          va = safeDivide(a.price - a.cost, tPrice, 0)
          vb = safeDivide(b.price - b.cost, tPrice, 0)
          break
        default:
          va = a.cost
          vb = b.cost
      }
      return dir === 'asc' ? va - vb : vb - va
    })
    return sorted
  }, [currentResult, supplierSort, supplierFilter])

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

  const supplierData = Array.from(r.supplierTotals.values())
  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + s.price, 0)
  const totalSupplierAbsPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)
  const totalSupplierCost = supplierData.reduce((sum, s) => sum + s.cost, 0)

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

  const toggleSort = (key: SortKey) => {
    setSupplierSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
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
          filteredSupplierData={filteredSupplierData}
          totalSupplierCost={totalSupplierCost}
          totalSupplierPrice={totalSupplierPrice}
          totalSupplierAbsPrice={totalSupplierAbsPrice}
          onExplain={handleExplain}
          onCustomCategoryChange={handleCustomCategoryChange}
          supplierSort={supplierSort}
          onToggleSort={toggleSort}
          supplierFilter={supplierFilter}
          onSupplierFilterChange={setSupplierFilter}
        />
      )}

      {showComparison && (
        <CategoryComparisonView
          selectedResults={selectedResults}
          storeNames={storeNames}
        />
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
