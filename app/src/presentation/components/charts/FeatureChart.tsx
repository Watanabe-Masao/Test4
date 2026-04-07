/**
 * 特徴量分析チャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → FeatureChartLogic.ts → ECharts option → EChart
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBDailyFeatures 直接 import）
 * @responsibility R:chart-view
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useFeatureChartPlan,
  type DailyFeaturesInput,
} from '@/application/hooks/plans/useFeatureChartPlan'
import {
  buildFeatureChartData,
  Z_SCORE_THRESHOLD,
  type FeatureChartDataPoint,
} from './FeatureChartLogic'
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
  lineDefaults,
} from './builders'
import { toCommaYen } from './echartsOptionBuilders'
import { AnomalyGrid, AnomalyCard, AnomalyDate, AnomalyValue } from './FeatureChart.styles'

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(chartData: readonly FeatureChartDataPoint[], theme: AppTheme): EChartsOption {
  const dates = chartData.map((d) => d.date)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; color: string }[]
        if (!Array.isArray(items) || items.length === 0 || !items[0]) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${(items[0] as { name?: string }).name ?? ''}</div>`
        const rows = items
          .filter((item) => item.value != null && item.value !== 0)
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span>${item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace">${toCommaYen(item.value!)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '異常検出',
        type: 'bar',
        data: chartData.map((d) => d.anomaly),
        itemStyle: { color: theme.colors.palette.dangerDark, opacity: 0.3 },
        barWidth: 8,
      },
      {
        name: '28日MA',
        type: 'line',
        data: chartData.map((d) => d.ma28),
        ...lineDefaults({ color: theme.colors.palette.slate, dashed: true }),
        connectNulls: true,
      },
      {
        name: '7日MA',
        type: 'line',
        data: chartData.map((d) => d.ma7),
        ...lineDefaults({ color: theme.colors.palette.cyan, dashed: true, width: 1.5 }),
        connectNulls: true,
      },
      {
        name: '3日MA',
        type: 'line',
        data: chartData.map((d) => d.ma3),
        ...lineDefaults({ color: theme.colors.palette.primary, width: 1.5 }),
        connectNulls: true,
      },
      {
        name: '売上実績',
        type: 'line',
        data: chartData.map((d) => d.sales),
        ...lineDefaults({ color: theme.colors.palette.primary }),
        symbolSize: 4,
      },
    ],
  }
}

export const FeatureChart = memo(function FeatureChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const input = useMemo<DailyFeaturesInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
    }
  }, [currentDateRange, selectedStoreIds])

  const { data: output, isLoading, error } = useFeatureChartPlan(queryExecutor, input)

  const features = output?.records ?? null

  const { chartData, anomalies } = useMemo(
    () => (features ? buildFeatureChartData(features) : { chartData: [], anomalies: [] }),
    [features],
  )

  const option = useMemo(() => buildOption(chartData, theme), [chartData, theme])

  if (error) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !features) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!queryExecutor || chartData.length === 0) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="売上トレンド分析"
      subtitle={`移動平均（3日/7日/28日）・Zスコア異常検出 | 赤棒 = Z > ${Z_SCORE_THRESHOLD} の異常日`}
    >
      <EChart option={option} height={300} ariaLabel="売上トレンド分析チャート" />

      {anomalies.length > 0 && (
        <AnomalyGrid>
          {anomalies.map((a) => (
            <AnomalyCard key={a.date} $type={a.type}>
              <AnomalyDate>
                {a.date.slice(5)} {a.type === 'spike' ? 'spike' : 'dip'}
              </AnomalyDate>
              <AnomalyValue>
                {fmt(a.sales)} (z={a.zScore})
              </AnomalyValue>
            </AnomalyCard>
          ))}
        </AnomalyGrid>
      )}
    </ChartCard>
  )
})
