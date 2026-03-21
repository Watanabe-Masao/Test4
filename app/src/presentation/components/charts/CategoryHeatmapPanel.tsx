/**
 * CategoryHeatmapPanel → CategoryTrendPanel
 *
 * 点数選択時のサブ分析パネル。
 * 既存 CategoryTrendChart（カテゴリ別日次売上推移）をラップ。
 * 部門/ライン/クラス階層切替、上位N件、曜日フィルタを内蔵。
 */
import { memo } from 'react'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { CategoryTrendChart } from './CategoryTrendChart'

interface Props {
  readonly ctx: DuckQueryContext
}

export const CategoryHeatmapPanel = memo(function CategoryHeatmapPanel({ ctx }: Props) {
  return (
    <CategoryTrendChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.currentDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      hideDowSelector
    />
  )
})
