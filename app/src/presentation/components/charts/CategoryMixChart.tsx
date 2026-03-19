/**
 * カテゴリ構成比推移チャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → CategoryMixChartLogic.ts → ECharts option → EChart
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBCategoryMixWeekly } from '@/application/hooks/useDuckDBQuery'
import { buildMixChartData, type CategoryMeta } from './CategoryMixChartLogic'
import { toPct } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { chartFontSize } from '@/presentation/theme/tokens'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryGrid,
  ShiftCard,
  ShiftName,
  ShiftValue,
} from './CategoryMixChart.styles'

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
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
    xAxis: {
      type: 'category',
      data: weeks,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
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
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const {
    data: mixRows,
    error,
    isLoading,
  } = useDuckDBCategoryMixWeekly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

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
  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
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
