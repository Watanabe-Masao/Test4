/**
 * HourlyWeatherModal.builders — 時間別天気チャートの ECharts option 構築
 *
 * HourlyWeatherModal から option 構築を分離。純粋関数のみ。React 依存なし。
 *
 * @responsibility R:chart-option
 */
import type { AppTheme } from '@/presentation/theme/theme'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'

export type HourlyRightMetric = 'precipitation' | 'sunshine' | 'humidity'

export interface ChartPoint {
  readonly hour: string
  readonly temperature?: number
  readonly precipitation?: number
  readonly sunshine?: number
  readonly humidity?: number
  readonly prevTemperature?: number
  readonly prevPrecipitation?: number
  readonly prevSunshine?: number
  readonly prevHumidity?: number
}

export interface BuildHourlyOptionInput {
  readonly chartData: readonly ChartPoint[]
  readonly hasRecords: boolean
  readonly hasPrev: boolean
  readonly isForecastMode: boolean
  readonly rightMetric: HourlyRightMetric
  readonly theme: AppTheme
}

function getRightValue(d: ChartPoint, metric: HourlyRightMetric) {
  return metric === 'sunshine' ? d.sunshine : metric === 'humidity' ? d.humidity : d.precipitation
}

function getPrevRightValue(d: ChartPoint, metric: HourlyRightMetric) {
  return metric === 'sunshine'
    ? d.prevSunshine
    : metric === 'humidity'
      ? d.prevHumidity
      : d.prevPrecipitation
}

/** 時間別天気チャートの ECharts option を構築 */
export function buildHourlyWeatherOption(input: BuildHourlyOptionInput): Record<string, unknown> {
  const { chartData, hasRecords, hasPrev, isForecastMode, rightMetric, theme } = input
  const hours = chartData.map((d) => d.hour)

  const rightLabel =
    rightMetric === 'sunshine' ? '日照(分)' : rightMetric === 'humidity' ? '湿度(%)' : '降水量(mm)'
  const rightUnit = rightMetric === 'sunshine' ? '分' : rightMetric === 'humidity' ? '%' : 'mm'

  type SeriesItem = Record<string, unknown>
  const seriesList: SeriesItem[] = []

  // 当年右軸データ（実測日のみ）
  if (hasRecords) {
    seriesList.push({
      name: rightLabel,
      type: 'bar',
      yAxisIndex: 1,
      data: chartData.map((d) => getRightValue(d, rightMetric) ?? null),
      itemStyle: { color: '#3b82f6', opacity: 0.3 },
    })
  }

  // 当年気温（実測日のみ）
  if (hasRecords) {
    seriesList.push({
      name: '気温',
      type: 'line',
      yAxisIndex: 0,
      data: chartData.map((d) => d.temperature ?? null),
      lineStyle: { color: '#ef4444', width: 2 },
      itemStyle: { color: '#ef4444' },
      symbolSize: 6,
      smooth: true,
    })
  }

  // 前年気温
  if (hasPrev || isForecastMode) {
    seriesList.push({
      name: isForecastMode ? '前年実績気温' : '前年気温',
      type: 'line',
      yAxisIndex: 0,
      data: chartData.map((d) => d.prevTemperature ?? null),
      lineStyle: {
        color: '#ef4444',
        width: isForecastMode ? 2 : 1.5,
        type: isForecastMode ? ('solid' as const) : ('dashed' as const),
        opacity: isForecastMode ? 1 : 0.5,
      },
      itemStyle: { color: '#ef4444', opacity: isForecastMode ? 1 : 0.4 },
      symbolSize: isForecastMode ? 6 : 4,
      smooth: true,
    })
  }

  // 前年右軸データ
  if (hasPrev || isForecastMode) {
    const prevRightLabel = isForecastMode ? `前年実績${rightLabel}` : `前年${rightLabel}`
    seriesList.push({
      name: prevRightLabel,
      type: 'bar',
      yAxisIndex: 1,
      data: chartData.map((d) => getPrevRightValue(d, rightMetric) ?? null),
      itemStyle: { color: '#3b82f6', opacity: isForecastMode ? 0.3 : 0.15 },
    })
  }

  return {
    grid: { ...standardGrid(), left: 0, right: 8 },
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params]
        let html = ''
        const items = arr as { seriesName: string; value: number | null; marker: string }[]
        if (items.length > 0) {
          const first = items[0] as { axisValue?: string }
          html += `${first.axisValue ?? ''}<br/>`
        }
        for (const p of items) {
          if (p.value == null) continue
          const isTemp = p.seriesName.includes('気温')
          const unitStr = isTemp ? '\u00B0C' : rightUnit
          html += `${p.marker} ${p.seriesName}: ${(p.value as number).toFixed(1)}${unitStr}<br/>`
        }
        return html
      },
    },
    legend: { textStyle: { color: theme.colors.text3, fontSize: 9 }, bottom: 0 },
    xAxis: {
      type: 'category' as const,
      data: hours,
      axisLabel: { color: theme.colors.text3, fontSize: 10, interval: 2 },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '\u00B0C',
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          formatter: (v: number) => `${v}\u00B0`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      {
        type: 'value' as const,
        name: rightUnit,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          formatter: (v: number) => `${v}${rightUnit}`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: seriesList,
  }
}
