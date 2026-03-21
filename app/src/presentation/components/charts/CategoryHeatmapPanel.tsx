/**
 * CategoryHeatmapPanel — 点数選択時のヒートマップ分析パネル
 *
 * 既存 HeatmapChart（時間帯×曜日）をサブパネルとして配置。
 * 部門/ライン/クラスのフィルタ機能は HeatmapChart 内蔵のものを活用。
 */
import { memo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { HeatmapChart } from './HeatmapChart'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export const CategoryHeatmapPanel = memo(function CategoryHeatmapPanel({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  return (
    <HeatmapChart
      duckConn={duckConn}
      duckDataVersion={duckDataVersion}
      currentDateRange={currentDateRange}
      selectedStoreIds={selectedStoreIds}
      prevYearScope={prevYearScope}
    />
  )
})
