import { ChartErrorBoundary } from '@/presentation/components/common'
import type { StoreResult } from '@/domain/models'
import { ChartGrid } from './CategoryPage.styles'
import {
  StoreComparisonCategoryBarChart,
  StoreComparisonMarkupRadarChart,
} from './CategoryComparisonCharts'

interface CategoryComparisonViewProps {
  readonly selectedResults: StoreResult[]
  readonly storeNames: Map<string, string>
}

export function CategoryComparisonView({
  selectedResults,
  storeNames,
}: CategoryComparisonViewProps) {
  return (
    <ChartErrorBoundary>
      <ChartGrid>
        <StoreComparisonCategoryBarChart
          selectedResults={selectedResults}
          storeNames={storeNames}
        />
        <StoreComparisonMarkupRadarChart
          selectedResults={selectedResults}
          storeNames={storeNames}
        />
      </ChartGrid>
    </ChartErrorBoundary>
  )
}
