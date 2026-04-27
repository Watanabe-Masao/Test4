/**
 * カテゴリ別日次売上推移チャート (ECharts)
 *
 * データ取得・状態管理は useCategoryTrendChartData に分離。
 * 本コンポーネントは描画のみ。
 *
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { DowPresetSelector } from '@/presentation/components/charts/DowPresetSelector'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from '@/presentation/components/charts/ChartState'
import { EChart } from '@/presentation/components/charts/EChart'
import { useCategoryTrendChartData } from '@/presentation/components/charts/useCategoryTrendChartData'
import type { TrendMetric } from '@/features/category/ui/charts/CategoryTrendChartLogic'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryRow,
  SummaryItem,
  BreadcrumbBar,
  BreadcrumbItem,
  BreadcrumbSep,
  YoYToggle,
} from '@/features/category/ui/charts/CategoryTrendChart.styles'

type HierarchyLevel = 'department' | 'line' | 'klass'

const TOP_N_OPTIONS = [5, 8, 10] as const

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const TOP_N_SEGMENT_OPTIONS: readonly { value: string; label: string }[] = TOP_N_OPTIONS.map(
  (n) => ({ value: String(n), label: `${n}件` }),
)

const METRIC_OPTIONS: readonly { value: TrendMetric; label: string }[] = [
  { value: 'amount', label: '金額' },
  { value: 'quantity', label: '点数' },
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly hideDowSelector?: boolean
  readonly embedded?: boolean
}

export const CategoryTrendChart = memo(function CategoryTrendChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  hideDowSelector,
  embedded,
}: Props) {
  const d = useCategoryTrendChartData({
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
  })

  if (d.error) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartError message={`${d.errorMessage}: ${d.error}`} />
      </ChartCard>
    )
  }
  if (d.isLoading && !d.trendRows) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!d.queryExecutor || d.chartData.length === 0) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const hasDrill = d.drill.deptCode != null
  const topCategory = d.categories[0]
  const subtitle = `上位${d.topN}カテゴリの日次売上トレンド | 月跨ぎ対応${d.selectedDows.length > 0 ? ' | 曜日フィルタ適用中' : ''}`

  const content = (
    <>
      {hasDrill && (
        <BreadcrumbBar>
          <BreadcrumbItem $active={false} onClick={() => d.handleBreadcrumbClick('root')}>
            全体
          </BreadcrumbItem>
          <BreadcrumbSep>▸</BreadcrumbSep>
          {d.drill.deptCode && (
            <>
              <BreadcrumbItem
                $active={d.level === 'line' && !d.drill.lineCode}
                onClick={() => d.handleBreadcrumbClick('department')}
              >
                {d.drill.deptName ?? d.drill.deptCode}
              </BreadcrumbItem>
              {d.drill.lineCode && (
                <>
                  <BreadcrumbSep>▸</BreadcrumbSep>
                  <BreadcrumbItem $active onClick={() => {}}>
                    {d.drill.lineName ?? d.drill.lineCode}
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbBar>
      )}

      <ControlRow>
        {!hasDrill && (
          <ChipGroup>
            <ChipLabel>階層:</ChipLabel>
            <SegmentedControl
              options={LEVEL_SEGMENT_OPTIONS}
              value={d.level}
              onChange={d.handleLevelChange}
              ariaLabel="階層レベル"
            />
          </ChipGroup>
        )}
        <ChipGroup>
          <ChipLabel>指標:</ChipLabel>
          <SegmentedControl
            options={METRIC_OPTIONS}
            value={d.metric}
            onChange={d.setMetric}
            ariaLabel="指標切替"
          />
        </ChipGroup>
        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          <SegmentedControl
            options={TOP_N_SEGMENT_OPTIONS}
            value={String(d.topN)}
            onChange={(v) => d.setTopN(Number(v))}
            ariaLabel="表示件数"
          />
        </ChipGroup>
        {d.prevYearScope && (
          <YoYToggle $active={d.showYoY} onClick={() => d.setShowYoY((p) => !p)}>
            前年比 {d.showYoY ? 'ON' : 'OFF'}
          </YoYToggle>
        )}
        {!hideDowSelector && (
          <DowPresetSelector selectedDows={d.selectedDows} onChange={d.handleDowChange} />
        )}
      </ControlRow>

      <EChart
        option={d.option}
        height={320}
        onClick={d.handleChartClick}
        ariaLabel="カテゴリ別売上推移チャート"
      />

      <SummaryRow>
        {topCategory && (
          <SummaryItem>
            最大: {topCategory.name} (
            {d.isQuantityMode
              ? `${topCategory.totalAmount.toLocaleString()}点`
              : d.fmt(topCategory.totalAmount)}
            )
          </SummaryItem>
        )}
        <SummaryItem>対象日数: {d.chartData.length}日</SummaryItem>
        <SummaryItem>カテゴリ数: {d.categories.length}</SummaryItem>
        {d.canDrill && <SummaryItem>ドリルダウン: チャート上のカテゴリをクリック</SummaryItem>}
      </SummaryRow>
    </>
  )

  if (embedded) return content

  return (
    <ChartCard title="カテゴリ別売上推移" subtitle={subtitle}>
      {content}
    </ChartCard>
  )
})
