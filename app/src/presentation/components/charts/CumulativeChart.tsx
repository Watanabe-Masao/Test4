/**
 * 月跨ぎ累積売上チャート (ECharts)
 *
 * 日別累積クエリを使い、複数月にわたる累積売上の推移を表示する。
 *
 * パイプライン:
 *   QueryHandler → CumulativeChartLogic.ts → ECharts option → EChart
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBDailyCumulative 直接 import）
 * @responsibility R:chart-view
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useCumulativeChartPlan,
  type DailyCumulativeInput,
} from '@/application/hooks/plans/useCumulativeChartPlan'
import { dateRangeToKeys } from '@/domain/models/calendar'
import {
  buildCumulativeChartData,
  computeCumulativeSummary,
  type CumulativeChartDataPoint,
} from './CumulativeChartLogic'
import { useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { SummaryRow, SummaryItem } from './CumulativeChart.styles'

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

/** Logic 出力 → ECharts option */
function buildOption(
  chartData: readonly CumulativeChartDataPoint[],
  theme: AppTheme,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  const dailyValues = chartData.map((d) => d.daily)
  const cumulativeValues = chartData.map((d) => d.cumulative)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { name: string; seriesName: string; value: number; color: string }[]
        if (!Array.isArray(items) || items.length === 0 || !items[0]) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${items[0].name ?? ''}</div>`
        const rows = items
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span>${item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace">${toCommaYen(item.value)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: [
      { ...yenYAxis(theme), id: 'daily' },
      {
        ...yenYAxis(theme),
        id: 'cumulative',
        position: 'right' as const,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '日別売上',
        type: 'bar',
        yAxisIndex: 0,
        data: dailyValues,
        itemStyle: { color: theme.colors.palette.cyan, opacity: 0.6 },
        barWidth: 6,
      },
      {
        name: '累積売上',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativeValues,
        lineStyle: { color: theme.colors.palette.primary, width: 2 },
        itemStyle: { color: theme.colors.palette.primary },
        symbol: 'none',
        smooth: false,
      },
    ],
  }
}

export const CumulativeChart = memo(function CumulativeChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const input = useMemo<DailyCumulativeInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
    }
  }, [currentDateRange, selectedStoreIds])

  const { data: output, error, isLoading } = useCumulativeChartPlan(queryExecutor, input)
  const rows = output?.records ?? null

  const chartData = useMemo(() => (rows ? buildCumulativeChartData(rows) : []), [rows])
  const summary = useMemo(() => computeCumulativeSummary(chartData), [chartData])
  const option = useMemo(() => buildOption(chartData, theme), [chartData, theme])

  const subtitle =
    summary.dayCount > 0
      ? `累計 ${fmt(summary.totalSales)} | 日平均 ${fmt(summary.avgDaily)} | ${summary.dayCount}日経過`
      : undefined

  if (error) {
    return (
      <ChartCard title="売上進捗">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error.message}`} />
      </ChartCard>
    )
  }

  if (isLoading && !rows) {
    return (
      <ChartCard title="売上進捗">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!queryExecutor?.isReady || chartData.length === 0) {
    return (
      <ChartCard title="売上進捗">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="売上進捗" subtitle={subtitle}>
      <EChart option={option} height={300} ariaLabel="売上進捗チャート" />

      <SummaryRow>
        <SummaryItem>累計: {fmt(summary.totalSales)}</SummaryItem>
        <SummaryItem>日平均: {fmt(summary.avgDaily)}</SummaryItem>
        <SummaryItem>対象日数: {summary.dayCount}日</SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
