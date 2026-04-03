/**
 * カテゴリ構成比推移チャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → CategoryMixChartLogic.ts → ECharts option → EChart
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBCategoryMixWeekly 直接 import）
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useCategoryMixChartPlan,
  type CategoryMixWeeklyInput,
} from '@/application/hooks/plans/useCategoryMixChartPlan'
import {
  buildMixChartData,
  type CategoryMeta,
} from '@/features/category/ui/charts/CategoryMixChartLogic'
import { toPct } from '@/presentation/components/charts/chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from '@/presentation/components/charts/ChartState'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { categoryXAxis, valueYAxis } from '@/presentation/components/charts/builders'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryGrid,
  ShiftCard,
  ShiftName,
  ShiftValue,
} from '@/features/category/ui/charts/CategoryMixChart.styles'

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(
  chartData: readonly { week: string; [k: string]: string | number }[],
  categories: readonly CategoryMeta[],
  theme: AppTheme,
): EChartsOption {
  const weeks = chartData.map((d) => d.week)
  const colors = theme.chart.series

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
    },
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(weeks, theme),
    yAxis: valueYAxis(theme, { formatter: (v: number) => toPct(v / 100, 0), max: 100 }),
    series: categories.map((cat, i) => ({
      name: cat.name,
      type: 'line' as const,
      stack: 'mix',
      areaStyle: { opacity: 0.7 },
      data: chartData.map((d) => (d[cat.code] as number) ?? 0),
      lineStyle: { color: colors[i % colors.length], width: 1 },
      itemStyle: { color: colors[i % colors.length] },
      symbol: 'none',
    })),
  }
}

export const CategoryMixChart = memo(function CategoryMixChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const input = useMemo<CategoryMixWeeklyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
    }
  }, [currentDateRange, selectedStoreIds, level])

  const { data: output, error, isLoading } = useCategoryMixChartPlan(queryExecutor, input)

  const mixRows = output?.records ?? null

  const { chartData, categories, topGainer, topLoser } = useMemo(
    () =>
      mixRows
        ? buildMixChartData(mixRows)
        : { chartData: [], categories: [], topGainer: null, topLoser: null },
    [mixRows],
  )

  const option = useMemo(
    () => buildOption(chartData, categories, theme),
    [chartData, categories, theme],
  )

  if (error) {
    return (
      <ChartCard title="カテゴリ構成比推移">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !mixRows) {
    return (
      <ChartCard title="カテゴリ構成比推移">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!queryExecutor || chartData.length === 0) {
    return (
      <ChartCard title="カテゴリ構成比推移">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="カテゴリ構成比推移" subtitle="週次のカテゴリ別売上構成比 | マルチ月対応">
      <ControlRow>
        <ChipGroup>
          <ChipLabel>階層:</ChipLabel>
          <SegmentedControl
            options={LEVEL_SEGMENT_OPTIONS}
            value={level}
            onChange={handleLevelChange}
            ariaLabel="階層レベル"
          />
        </ChipGroup>
      </ControlRow>

      <EChart option={option} height={320} ariaLabel="カテゴリ構成比推移チャート" />

      {(topGainer || topLoser) && (
        <SummaryGrid>
          {topGainer && topGainer.latestShift != null && topGainer.latestShift > 0 && (
            <ShiftCard $positive>
              <ShiftName>構成比上昇: {topGainer.name}</ShiftName>
              <ShiftValue>
                +{toPct(topGainer.latestShift / 100, 1)} (平均 {toPct(topGainer.avgShare / 100, 1)})
              </ShiftValue>
            </ShiftCard>
          )}
          {topLoser && topLoser.latestShift != null && topLoser.latestShift < 0 && (
            <ShiftCard $positive={false}>
              <ShiftName>構成比下降: {topLoser.name}</ShiftName>
              <ShiftValue>
                {toPct(topLoser.latestShift / 100, 1)} (平均 {toPct(topLoser.avgShare / 100, 1)})
              </ShiftValue>
            </ShiftCard>
          )}
        </SummaryGrid>
      )}
    </ChartCard>
  )
})
