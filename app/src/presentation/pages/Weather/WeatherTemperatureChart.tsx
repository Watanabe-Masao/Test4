/**
 * WeatherTemperatureChart — 月間気温推移チャート（ECharts）
 *
 * 最高/最低気温のエリア帯 + 平均気温ライン + 降水量バー（下から上へ） + 前年比較を表示。
 * X軸に天気アイコン付き。日クリック・選択日ハイライト対応。
 * 天気ページ専用。売上データへの依存なし。
 */
import { memo, useMemo, useCallback, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/presentation/components/charts/EChart'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'

/** WeatherBadge と同じ絵文字を使用 */
const WEATHER_ICONS: Readonly<Record<WeatherCategory, string>> = {
  sunny: '\u2600\uFE0F', // ☀️
  cloudy: '\u2601\uFE0F', // ☁️
  rainy: '\uD83C\uDF27\uFE0F', // 🌧️
  snowy: '\u2744\uFE0F', // ❄️
  other: '\uD83C\uDF00', // 🌀
}

export type ChartRightMetric = 'precipitation' | 'sunshine' | 'humidity'

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearDaily?: readonly DailyWeatherSummary[]
  readonly year: number
  readonly month: number
  readonly selectedDay?: number | null
  readonly onDayClick?: (dateKey: string) => void
  readonly onDayDblClick?: (dateKey: string) => void
}

const METRIC_OPTIONS: readonly { key: ChartRightMetric; label: string }[] = [
  { key: 'precipitation', label: '降水量' },
  { key: 'sunshine', label: '日照' },
  { key: 'humidity', label: '湿度' },
]

export const WeatherTemperatureChart = memo(function WeatherTemperatureChart({
  daily,
  prevYearDaily,
  year,
  month,
  selectedDay,
  onDayClick,
  onDayDblClick,
}: Props) {
  const [rightMetric, setRightMetric] = useState<ChartRightMetric>('precipitation')
  const ct = useChartTheme()

  // Build a map from day number to prevYear data for alignment
  const prevYearMap = useMemo(() => {
    if (!prevYearDaily || prevYearDaily.length === 0) return null
    const map = new Map<number, DailyWeatherSummary>()
    for (const d of prevYearDaily) {
      const day = Number(d.dateKey.split('-')[2])
      map.set(day, d)
    }
    return map
  }, [prevYearDaily])

  const option = useMemo<EChartsOption>(() => {
    if (daily.length === 0) return {}

    const days: string[] = []
    const dayNumbers: number[] = []
    const dateKeys: string[] = []

    for (const d of daily) {
      const day = Number(d.dateKey.split('-')[2])
      const dow = new Date(year, month - 1, day).getDay()
      const dowLabel = ['日', '月', '火', '水', '木', '金', '土'][dow]
      const icon = WEATHER_ICONS[categorizeWeatherCode(d.dominantWeatherCode)]
      const prevDay = prevYearMap?.get(day)
      const prevIcon = prevDay
        ? WEATHER_ICONS[categorizeWeatherCode(prevDay.dominantWeatherCode)]
        : ''
      const prevLine = prevIcon ? `\n{prev|${prevIcon}}` : ''
      days.push(`${day}(${dowLabel})\n{icon|${icon}}${prevLine}`)
      dayNumbers.push(day)
      dateKeys.push(d.dateKey)
    }

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

    // Right metric data + axis config
    const rightData =
      rightMetric === 'sunshine' ? sunshine : rightMetric === 'humidity' ? humidity : precip
    const rightPrevData =
      rightMetric === 'sunshine'
        ? prevSunshine
        : rightMetric === 'humidity'
          ? prevHumidity
          : prevPrecip
    const rightLabel =
      rightMetric === 'sunshine' ? '日照時間' : rightMetric === 'humidity' ? '湿度' : '降水量'
    const rightUnit = rightMetric === 'sunshine' ? 'h' : rightMetric === 'humidity' ? '%' : 'mm'
    const rightPrevLabel = `前年${rightLabel}`

    // Axis scaling
    const allRight = [...rightData, ...rightPrevData.filter((v): v is number => v != null)]
    const maxRight = Math.max(...allRight, 1)

    // Compute temperature range
    const allTemps = [...maxTemps, ...minTemps]
    const tempAxisMin = Math.floor(Math.min(...allTemps) - 3)
    const tempAxisMax = Math.ceil(Math.max(...allTemps) + 3)

    // Right Y axis: 降水量は 50mm 刻み、日照は 5h 刻み、湿度は 20% 刻み
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
      rightCeil = 100 // 湿度は 0-100%
    }
    const rightAxisMax = rightMetric === 'humidity' ? 100 * 4 : rightCeil * 4

    // Selected day markLine
    const selectedDayIndex = selectedDay != null ? dayNumbers.indexOf(selectedDay) : -1

    const markLineData =
      selectedDayIndex >= 0
        ? [
            {
              xAxis: selectedDayIndex,
              lineStyle: {
                color: ct.colors.primary,
                width: 2,
                type: 'solid' as const,
              },
              label: { show: false },
            },
          ]
        : []

    // Build legend data
    const legendData = ['最高気温', '平均気温', '最低気温', rightLabel]
    if (prevYearMap) {
      legendData.push(rightPrevLabel, '前年最高', '前年平均', '前年最低')
    }

    return {
      grid: {
        top: 40,
        right: 60,
        bottom: prevYearMap ? 80 : 60,
        left: 50,
        containLabel: false,
      },
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
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: legendData,
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          fontSize: 10,
          color: ct.textMuted,
          interval: 0,
          rotate: 0,
          rich: {
            icon: {
              fontSize: 14,
              lineHeight: 18,
              align: 'center',
            },
            prev: {
              fontSize: 11,
              lineHeight: 14,
              align: 'center',
              color: '#9ca3af',
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
          axisLabel: {
            fontSize: 10,
            color: ct.textMuted,
            formatter: (v: number) => (v <= rightCeil ? `${v}` : ''),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        // Temperature band: invisible base (min temps)
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
        // Temperature band: max-min area
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
        // Current year max temperature
        {
          name: '最高気温',
          type: 'line',
          data: maxTemps,
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true,
          markLine:
            markLineData.length > 0
              ? {
                  silent: true,
                  symbol: 'none',
                  data: markLineData,
                }
              : undefined,
        },
        // Current year average temperature
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
        // Current year min temperature
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
        // 右軸バー — 当年（左）+ 前年（右）横並び
        {
          name: rightLabel,
          type: 'bar',
          yAxisIndex: 1,
          data: rightData.map((v, i) => ({
            value: v,
            itemStyle:
              selectedDayIndex === i ? { color: '#2563eb', borderRadius: [2, 2, 0, 0] } : undefined,
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
        // 前年バー（隣に並べる、色を変えて区別）
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
        // Previous year lines (dashed, lighter)
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
    }
  }, [daily, year, month, ct, prevYearMap, selectedDay, rightMetric])

  const extractDateKey = useCallback(
    (params: Record<string, unknown>) => {
      const dataIndex = params['dataIndex']
      if (typeof dataIndex !== 'number' || dataIndex < 0 || dataIndex >= daily.length) return null
      return daily[dataIndex].dateKey
    },
    [daily],
  )

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick) return
      const dateKey = extractDateKey(params)
      if (dateKey) onDayClick(dateKey)
    },
    [onDayClick, extractDateKey],
  )

  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayDblClick) return
      const dateKey = extractDateKey(params)
      if (dateKey) onDayDblClick(dateKey)
    },
    [onDayDblClick, extractDateKey],
  )

  if (daily.length === 0) return null

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
        {METRIC_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRightMetric(key)}
            style={{
              padding: '2px 10px',
              fontSize: '0.7rem',
              borderRadius: 4,
              border: `1px solid ${rightMetric === key ? 'transparent' : '#d1d5db'}`,
              background: rightMetric === key ? '#3b82f6' : '#f9fafb',
              color: rightMetric === key ? '#fff' : '#374151',
              fontWeight: rightMetric === key ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <EChart
        option={option}
        height={440}
        onClick={handleClick}
        onDblClick={handleDblClick}
        ariaLabel="月間気温推移チャート"
      />
    </div>
  )
})
