/**
 * 前年比較チャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → YoYChartLogic.ts → ECharts option → EChart
 *
 * 表示モード:
 *   - 日次比較: 当年売上線 + 前年売上線（破線）+ 差分棒グラフ
 *   - ウォーターフォール: 前年→当年の累積差分を滝グラフで表示
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ComparisonFrame, PrevYearScope } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBYoyDaily } from '@/application/hooks/useDuckDBQuery'
import {
  buildYoYChartData,
  buildYoYWaterfallData,
  computeYoYSummary,
  type YoYChartDataPoint,
  type WaterfallItem,
} from './YoYChartLogic'
import { useCurrencyFormatter, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common'
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
import { SummaryRow, SummaryItem } from './YoYChart.styles'

type ViewMode = 'line' | 'waterfall'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'line', label: '日次比較' },
  { value: 'waterfall', label: 'ウォーターフォール' },
]

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly frame: ComparisonFrame | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

function buildLineOption(
  chartData: readonly YoYChartDataPoint[],
  theme: AppTheme,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  return {
    grid: standardGrid(),
    tooltip: standardTooltip(theme),
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '前年差',
        type: 'bar',
        data: chartData.map((d) => d.diff),
        itemStyle: { color: theme.colors.palette.success, opacity: 0.4 },
        barWidth: 6,
      },
      {
        name: '前年売上',
        type: 'line',
        data: chartData.map((d) => d.prevSales),
        lineStyle: { color: theme.colors.palette.slate, width: 1.5, type: 'dashed' },
        itemStyle: { color: theme.colors.palette.slate },
        symbol: 'none',
        connectNulls: true,
      },
      {
        name: '当年売上',
        type: 'line',
        data: chartData.map((d) => d.curSales),
        lineStyle: { color: theme.colors.palette.primary, width: 2 },
        itemStyle: { color: theme.colors.palette.primary },
        symbolSize: 4,
      },
    ],
  }
}

function buildWaterfallOption(
  waterfallData: readonly WaterfallItem[],
  theme: AppTheme,
): EChartsOption {
  const names = waterfallData.map((d) => d.name)
  return {
    grid: { ...standardGrid(), bottom: 50 },
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const item = Array.isArray(params) ? params[0] : params
        const p = item as { name: string; value: number[] }
        const val = p.value?.[1] != null && p.value?.[0] != null ? p.value[1] - p.value[0] : 0
        return `${p.name}<br/>${toCommaYen(val)}`
      },
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
        rotate: 45,
      },
    },
    yAxis: yenYAxis(theme),
    series: [
      {
        type: 'bar',
        data: waterfallData.map((d) => {
          const color = d.isTotal
            ? theme.colors.palette.primary
            : d.value >= 0
              ? sc.positive
              : sc.negative
          return {
            value: [d.base, d.base + d.bar],
            itemStyle: { color, opacity: d.isTotal ? 0.7 : 0.85 },
          }
        }),
        barWidth: '60%',
      },
    ],
  }
}

export const YoYChart = memo(function YoYChart({
  duckConn,
  duckDataVersion,
  frame,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('line')

  const {
    data: rows,
    isLoading,
    error,
  } = useDuckDBYoyDaily(duckConn, duckDataVersion, frame, selectedStoreIds, prevYearScope)

  const chartData = useMemo(() => (rows ? buildYoYChartData(rows) : []), [rows])
  const waterfallData = useMemo(
    () =>
      viewMode === 'waterfall' && chartData.length > 0 ? buildYoYWaterfallData(chartData) : [],
    [viewMode, chartData],
  )
  const summary = useMemo(() => computeYoYSummary(chartData), [chartData])
  const growthRateLabel = summary.growthRate != null ? toPct(summary.growthRate, 1) : '-'

  const option = useMemo(
    () =>
      viewMode === 'line'
        ? buildLineOption(chartData, theme)
        : buildWaterfallOption(waterfallData, theme),
    [viewMode, chartData, waterfallData, theme],
  )

  if (error) {
    return (
      <ChartCard title="前年比較">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !rows) {
    return (
      <ChartCard title="前年比較">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!duckConn || duckDataVersion === 0 || !frame || chartData.length === 0) {
    return (
      <ChartCard title="前年比較">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const subtitle =
    viewMode === 'line'
      ? '当年 vs 前年 日別売上 | 月跨ぎ対応 | 棒 = 前年差'
      : '前年→当年の累積差分 | 青 = 開始/終了 | 水色 = プラス | 橙 = マイナス'

  const toolbar = (
    <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} ariaLabel="ビュー切替" />
  )

  return (
    <ChartCard title="前年比較" subtitle={subtitle} toolbar={toolbar}>
      <EChart option={option} height={300} ariaLabel="前年比較チャート" />

      <SummaryRow>
        <SummaryItem>当年計: {fmt(summary.totalCur)}</SummaryItem>
        <SummaryItem>前年計: {fmt(summary.totalPrev)}</SummaryItem>
        <SummaryItem $accent={summary.totalDiff >= 0 ? sc.positive : sc.negative}>
          差分: {summary.totalDiff >= 0 ? '+' : ''}
          {fmt(summary.totalDiff)} ({growthRateLabel})
        </SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
