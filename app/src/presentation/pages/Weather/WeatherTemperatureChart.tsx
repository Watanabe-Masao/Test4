/**
 * WeatherTemperatureChart — 月間気温推移チャート（ECharts）
 *
 * 最高/最低気温のエリア帯 + 平均気温ライン + 降水量バー（下から上へ） + 前年比較を表示。
 * X軸に天気アイコン付き。日クリック・選択日ハイライト対応。
 * 天気ページ専用。売上データへの依存なし。
 */
import { memo, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/presentation/components/charts/EChart'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'

const WEATHER_ICONS: Readonly<Record<WeatherCategory, string>> = {
  sunny: '\u2600',
  cloudy: '\u2601',
  rainy: '\u2602',
  snowy: '\u2744',
  other: '\u2014',
}

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearDaily?: readonly DailyWeatherSummary[]
  readonly year: number
  readonly month: number
  readonly selectedDay?: number | null
  readonly onDayClick?: (dateKey: string) => void
}

export const WeatherTemperatureChart = memo(function WeatherTemperatureChart({
  daily,
  prevYearDaily,
  year,
  month,
  selectedDay,
  onDayClick,
}: Props) {
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

    // Previous year data aligned by day number
    const prevMaxTemps = dayNumbers.map((day) => prevYearMap?.get(day)?.temperatureMax ?? null)
    const prevMinTemps = dayNumbers.map((day) => prevYearMap?.get(day)?.temperatureMin ?? null)
    const prevAvgTemps = dayNumbers.map((day) => {
      const v = prevYearMap?.get(day)?.temperatureAvg
      return v != null ? Math.round(v * 10) / 10 : null
    })
    const prevPrecip = dayNumbers.map((day) => prevYearMap?.get(day)?.precipitationTotal ?? null)

    // Compute max precipitation for axis scaling (include prev year)
    const allPrecip = [...precip, ...prevPrecip.filter((v): v is number => v != null)]
    const maxPrecip = Math.max(...allPrecip, 1)

    // Compute temperature range for the offset trick
    const allTemps = [...maxTemps, ...minTemps]
    const tempAxisMin = Math.floor(Math.min(...allTemps) - 3)
    const tempAxisMax = Math.ceil(Math.max(...allTemps) + 3)
    // Precipitation axis: we want bars at the bottom of the chart.
    // Use a normal (non-inverse) right axis with min=0 and max scaled so
    // precipitation values occupy roughly the bottom 25% of the chart.
    const precipAxisMax = Math.max(maxPrecip * 4, 10)

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
    const legendData = ['最高気温', '平均気温', '最低気温', '降水量']
    if (prevYearMap) {
      legendData.push('前年降水', '前年最高', '前年平均', '前年最低')
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
            const unit =
              item.seriesName === '降水量' || item.seriesName === '前年降水' ? 'mm' : '\u00B0C'
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
          name: '降水量 (mm)',
          nameTextStyle: { fontSize: 10, color: ct.textMuted },
          nameLocation: 'start',
          position: 'right',
          min: 0,
          max: precipAxisMax,
          axisLabel: {
            fontSize: 10,
            color: ct.textMuted,
            formatter: (v: number) => (v <= maxPrecip ? `${v}` : ''),
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
        // Precipitation bars (normal axis, grows from bottom up)
        {
          name: '降水量',
          type: 'bar',
          yAxisIndex: 1,
          data: precip.map((v, i) => ({
            value: v,
            itemStyle:
              selectedDayIndex === i
                ? {
                    color: ct.colors.primary,
                    borderRadius: [2, 2, 0, 0],
                    opacity: 1,
                  }
                : undefined,
          })),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 1,
              x2: 0,
              y2: 0,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.7)' },
              ],
            },
            borderRadius: [2, 2, 0, 0],
          },
          barMaxWidth: 16,
        },
        // Previous year precipitation (dashed outline bars)
        ...(prevYearMap
          ? [
              {
                name: '前年降水',
                type: 'bar' as const,
                yAxisIndex: 1,
                data: prevPrecip,
                itemStyle: {
                  color: 'transparent',
                  borderColor: 'rgba(59, 130, 246, 0.35)',
                  borderWidth: 1,
                  borderType: 'dashed' as const,
                  borderRadius: [2, 2, 0, 0],
                },
                barMaxWidth: 16,
                barGap: '-100%',
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
  }, [daily, year, month, ct, prevYearMap, selectedDay])

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick) return
      const dataIndex = params['dataIndex']
      if (typeof dataIndex !== 'number') return
      if (dataIndex < 0 || dataIndex >= daily.length) return
      const dateKey = daily[dataIndex].dateKey
      onDayClick(dateKey)
    },
    [onDayClick, daily],
  )

  if (daily.length === 0) return null

  return (
    <div style={{ width: '100%' }}>
      <EChart
        option={option}
        height={440}
        onClick={onDayClick ? handleClick : undefined}
        ariaLabel="月間気温推移チャート"
      />
    </div>
  )
})
