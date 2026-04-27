/**
 * CategoryHeatmapPanel → CategoryTrendPanel
 *
 * 点数選択時のサブ分析パネル。
 * 既存 CategoryTrendChart（カテゴリ別日次売上推移）をラップ。
 * 部門/ライン/クラス階層切替、上位N件、曜日フィルタを内蔵。
 *
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import type { DuckQueryContext } from '@/presentation/components/charts/SubAnalysisPanel'
import { CategoryTrendChart } from '@/features/category/ui/charts/CategoryTrendChart'

interface Props {
  readonly ctx: DuckQueryContext
}

export const CategoryHeatmapPanel = memo(function CategoryHeatmapPanel({ ctx }: Props) {
  return (
    <CategoryTrendChart
      queryExecutor={ctx.queryExecutor}
      currentDateRange={ctx.currentDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      prevYearScope={ctx.prevYearScope}
      hideDowSelector
      embedded
    />
  )
})
