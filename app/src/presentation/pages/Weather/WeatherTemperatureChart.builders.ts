/**
 * WeatherTemperatureChart.builders — ECharts option 構築
 *
 * WeatherTemperatureChart から option 構築ロジックを分離。
 * 純粋関数のみ。React 依存なし。
 *
 * @responsibility R:unclassified
 */
import type { DailyWeatherSummary, WeatherCategory } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import { calcInitialZoomRange } from './weatherChartNavigation'
import type { MonthBoundaries } from '@/application/hooks/useWeatherTriple'
import type { ChartRightMetric } from './WeatherTemperatureChart'

/** WeatherBadge と同じ絵文字を使用 */
const WEATHER_ICONS: Readonly<Record<WeatherCategory, string>> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

export interface ChartThemeColors {
  readonly bg2: string
  readonly grid: string
  readonly text: string
  readonly textMuted: string
}

export interface BuildOptionInput {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearMap: ReadonlyMap<number, DailyWeatherSummary> | null
  readonly selectedDays: ReadonlySet<string>
  readonly rightMetric: ChartRightMetric
  readonly monthBoundaries?: MonthBoundaries
  readonly ct: ChartThemeColors
}

/** X 軸ラベル + 日番号の配列を構築 */
function buildXAxisData(
  daily: readonly DailyWeatherSummary[],
  prevYearMap: ReadonlyMap<number, DailyWeatherSummary> | null,
) {
  const days: string[] = []
  const dayNumbers: number[] = []

  for (const d of daily) {
    const day = Number(d.dateKey.split('-')[2])
    const dMonth = Number(d.dateKey.slice(5, 7))
    const dYear = Number(d.dateKey.slice(0, 4))
    const dow = new Date(dYear, dMonth - 1, day).getDay()
    const dowLabel = ['日', '月', '火', '水', '木', '金', '土'][dow]
    const icon = WEATHER_ICONS[categorizeWeatherCode(d.dominantWeatherCode)]
    const dayLabel =
      day === 1 ? `{monthLabel|${dMonth}月}${day}(${dowLabel})` : `${day}(${dowLabel})`
    const prevDay = prevYearMap?.get(day)
    const prevIcon = prevDay
      ? `\n{prev|${WEATHER_ICONS[categorizeWeatherCode(prevDay.dominantWeatherCode)]}}`
      : ''
    days.push(`${dayLabel}\n{icon|${icon}}${prevIcon}`)
    dayNumbers.push(day)
  }

  return { days, dayNumbers }
}

/** 右軸メトリックの設定を解決 */
function resolveRightAxis(rightMetric: ChartRightMetric, maxRight: number) {
  let rightInterval: number
  let rightCeil: number
  if (rightMetric === 'precipitation') {
    rightInterval = 50
    rightCeil = Math.ceil(maxRight / 50) * 50 || 50
  } else if (rightMetric === 'sunshine') {
    rightInterval = 5
    rightCeil = Math.ceil(maxRight / 5) * 5 || 5
  } else {
    rightInterval = 20
    rightCeil = 100
  }
  const rightLabel =
    rightMetric === 'sunshine' ? '日照時間' : rightMetric === 'humidity' ? '湿度' : '降水量'
  const rightUnit = rightMetric === 'sunshine' ? 'h' : rightMetric === 'humidity' ? '%' : 'mm'
  return { rightInterval, rightCeil, rightLabel, rightUnit }
}

/** 選択日セット(dateKey)から連続範囲の markArea データを生成 */
export function buildMarkAreaRanges(
  daily: readonly { dateKey: string }[],
  selected: ReadonlySet<string>,
): unknown[][] {
  const style = { color: 'rgba(59,130,246,0.08)' }
  const areas: unknown[][] = []
  let rangeStart = -1
  for (let i = 0; i < daily.length; i++) {
    if (selected.has(daily[i].dateKey)) {
      if (rangeStart < 0) rangeStart = i
    } else {
      if (rangeStart >= 0) {
        areas.push([{ xAxis: rangeStart }, { xAxis: i - 1, itemStyle: style }])
        rangeStart = -1
      }
    }
  }
  if (rangeStart >= 0) {
    areas.push([{ xAxis: rangeStart }, { xAxis: daily.length - 1, itemStyle: style }])
  }
  return areas
}

/** 気温チャートの ECharts option を構築 */
export function buildTemperatureChartOption(input: BuildOptionInput): Record<string, unknown> {
  const { daily, prevYearMap, selectedDays, rightMetric, monthBoundaries, ct } = input

  const zoom = monthBoundaries ? calcInitialZoomRange(monthBoundaries) : null
  const zoomStart = zoom?.start ?? 0
  const zoomEnd = zoom?.end ?? 100
  if (daily.length === 0) return {}

  const { days, dayNumbers } = buildXAxisData(daily, prevYearMap)

  const maxTemps = daily.map((d) => d.temperatureMax)
  const minTemps = daily.map((d) => d.temperatureMin)
  const avgTemps = daily.map((d) => Math.round(d.temperatureAvg * 10) / 10)
  const precip = daily.map((d) => d.precipitationTotal)
  const sunshine = daily.map((d) => d.sunshineTotalHours)
  const humidity = daily.map((d) => d.humidityAvg)

  // Previous year data aligned by day number
  const prevMaxTemps = dayNumbers.map((day) => prevYearMap?.get(day)?.temperatureMax ?? null)
  const prevMinTemps = dayNumbers.map((day) => prevYearMap?.get(day)?.temperatureMin ?? null)
  const prevAvgTemps = dayNumbers.map((day) => {
    const v = prevYearMap?.get(day)?.temperatureAvg
    return v != null ? Math.round(v * 10) / 10 : null
  })
  const prevPrecip = dayNumbers.map((day) => prevYearMap?.get(day)?.precipitationTotal ?? null)
  const prevSunshine = dayNumbers.map((day) => prevYearMap?.get(day)?.sunshineTotalHours ?? null)
  const prevHumidity = dayNumbers.map((day) => prevYearMap?.get(day)?.humidityAvg ?? null)

  // Right metric
  const rightData =
    rightMetric === 'sunshine' ? sunshine : rightMetric === 'humidity' ? humidity : precip
  const rightPrevData =
    rightMetric === 'sunshine'
      ? prevSunshine
      : rightMetric === 'humidity'
        ? prevHumidity
        : prevPrecip

  const allRight = [...rightData, ...rightPrevData.filter((v): v is number => v != null)]
  const maxRight = Math.max(...allRight, 1)
  const { rightInterval, rightCeil, rightLabel, rightUnit } = resolveRightAxis(
    rightMetric,
    maxRight,
  )
  const rightPrevLabel = `前年${rightLabel}`
  const rightAxisMax = rightCeil

  // Temperature range
  const allTemps = [...maxTemps, ...minTemps]
  const tempAxisMin = Math.floor(Math.min(...allTemps) - 3)
  const tempAxisMax = Math.ceil(Math.max(...allTemps) + 3)

  // Selection
  const selectedSet = selectedDays
  const isSelected = (idx: number) => selectedSet.has(daily[idx]?.dateKey ?? '')

  // Legend
  const legendData = ['最高気温', '平均気温', '最低気温', rightLabel]
  if (prevYearMap) {
    legendData.push(rightPrevLabel, '前年最高', '前年平均', '前年最低')
  }

  return {
    grid: { top: 40, right: 60, bottom: prevYearMap ? 80 : 60, left: 50, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: ct.bg2,
      borderColor: ct.grid,
      textStyle: { color: ct.text, fontSize: 12 },
      formatter: (params: unknown) => {
        const items = params as {
          name: string
          value: number | null
          seriesName: string
          marker: string
        }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const rawName = items[0].name as string
        const displayName = rawName.split('\n')[0]
        let html = `<b>${displayName}</b><br/>`
        for (const item of items) {
          if (item.seriesName === 'band') continue
          if (item.value == null) continue
          const isRight = item.seriesName === rightLabel || item.seriesName === rightPrevLabel
          const unit = isRight ? rightUnit : '\u00B0C'
          html += `${item.marker} ${item.seriesName}: <b>${item.value}${unit}</b><br/>`
        }
        return html
      },
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 }, data: legendData },
    xAxis: {
      type: 'category',
      data: days,
      axisLabel: {
        fontSize: 10,
        color: ct.textMuted,
        interval: 0,
        rotate: 0,
        rich: {
          icon: { fontSize: 14, lineHeight: 18, align: 'center' },
          prev: { fontSize: 11, lineHeight: 14, align: 'center', color: '#9ca3af' },
          monthLabel: {
            fontSize: 11,
            fontWeight: 'bold',
            color: '#3b82f6',
            lineHeight: 16,
            align: 'center',
          },
        },
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '気温 (\u00B0C)',
        nameTextStyle: { fontSize: 10, color: ct.textMuted },
        min: tempAxisMin,
        max: tempAxisMax,
        axisLabel: { fontSize: 10, color: ct.textMuted, formatter: '{value}\u00B0' },
        splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' } },
      },
      {
        type: 'value',
        name: `${rightLabel} (${rightUnit})`,
        nameTextStyle: { fontSize: 10, color: ct.textMuted },
        nameLocation: 'start',
        position: 'right',
        min: 0,
        max: rightAxisMax,
        interval: rightInterval,
        axisLabel: { fontSize: 10, color: ct.textMuted, formatter: '{value}' },
        splitLine: { show: false },
      },
    ],
    series: [
      // Temperature band
      {
        name: 'band',
        type: 'line',
        data: minTemps,
        lineStyle: { width: 0 },
        itemStyle: { color: 'transparent' },
        areaStyle: { color: 'transparent' },
        symbol: 'none',
        stack: 'tempBand',
        silent: true,
      },
      {
        name: 'band',
        type: 'line',
        data: maxTemps.map((max, i) => max - minTemps[i]),
        lineStyle: { width: 0 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.15)' },
            ],
          },
        },
        symbol: 'none',
        stack: 'tempBand',
        silent: true,
      },
      // Current year temperatures
      {
        name: '最高気温',
        type: 'line',
        data: maxTemps,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true,
        ...(selectedSet.size > 0
          ? { markArea: { silent: true, data: buildMarkAreaRanges(daily, selectedSet) } }
          : {}),
      },
      {
        name: '平均気温',
        type: 'line',
        data: avgTemps,
        lineStyle: { color: '#f59e0b', width: 2.5 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 5,
        smooth: true,
      },
      {
        name: '最低気温',
        type: 'line',
        data: minTemps,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true,
      },
      // Right axis bars
      {
        name: rightLabel,
        type: 'bar',
        yAxisIndex: 1,
        data: rightData.map((v, i) => ({
          value: v,
          itemStyle: isSelected(i) ? { color: '#2563eb', borderRadius: [2, 2, 0, 0] } : undefined,
        })),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 1,
            x2: 0,
            y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.6)' },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
        barMaxWidth: 12,
      },
      // Previous year bars
      ...(prevYearMap
        ? [
            {
              name: rightPrevLabel,
              type: 'bar' as const,
              yAxisIndex: 1,
              data: rightPrevData,
              itemStyle: {
                color: {
                  type: 'linear' as const,
                  x: 0,
                  y: 1,
                  x2: 0,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: 'rgba(147, 197, 253, 0.15)' },
                    { offset: 1, color: 'rgba(147, 197, 253, 0.5)' },
                  ],
                },
                borderRadius: [2, 2, 0, 0],
              },
              barMaxWidth: 12,
            },
          ]
        : []),
      // Previous year temperature lines
      ...(prevYearMap
        ? [
            {
              name: '前年最高',
              type: 'line' as const,
              data: prevMaxTemps,
              lineStyle: { color: 'rgba(239, 68, 68, 0.4)', width: 1.5, type: 'dashed' as const },
              itemStyle: { color: 'rgba(239, 68, 68, 0.4)' },
              symbol: 'none',
              smooth: true,
              connectNulls: true,
            },
            {
              name: '前年平均',
              type: 'line' as const,
              data: prevAvgTemps,
              lineStyle: {
                color: 'rgba(245, 158, 11, 0.4)',
                width: 1.5,
                type: 'dashed' as const,
              },
              itemStyle: { color: 'rgba(245, 158, 11, 0.4)' },
              symbol: 'none',
              smooth: true,
              connectNulls: true,
            },
            {
              name: '前年最低',
              type: 'line' as const,
              data: prevMinTemps,
              lineStyle: {
                color: 'rgba(59, 130, 246, 0.4)',
                width: 1.5,
                type: 'dashed' as const,
              },
              itemStyle: { color: 'rgba(59, 130, 246, 0.4)' },
              symbol: 'none',
              smooth: true,
              connectNulls: true,
            },
          ]
        : []),
    ],
    // 3ヶ月連続スクロール
    ...(monthBoundaries
      ? {
          dataZoom: [
            {
              type: 'inside',
              xAxisIndex: 0,
              start: zoomStart,
              end: zoomEnd,
              zoomLock: true,
              moveOnMouseWheel: true,
            },
          ],
        }
      : {}),
  }
}
