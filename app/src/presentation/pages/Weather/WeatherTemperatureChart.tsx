/**
 * WeatherTemperatureChart — 月間気温推移チャート（ECharts）
 *
 * 最高/最低気温のエリア帯 + 平均気温ライン + 降水量バーを表示。
 * 天気ページ専用。売上データへの依存なし。
 */
import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/presentation/components/charts/EChart'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import type { DailyWeatherSummary } from '@/domain/models/record'

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly year: number
  readonly month: number
}

export const WeatherTemperatureChart = memo(function WeatherTemperatureChart({
  daily,
  year,
  month,
}: Props) {
  const ct = useChartTheme()

  const option = useMemo<EChartsOption>(() => {
    if (daily.length === 0) return {}
    const days = daily.map((d) => {
      const day = Number(d.dateKey.split('-')[2])
      const dow = new Date(year, month - 1, day).getDay()
      const dowLabel = ['日', '月', '火', '水', '木', '金', '土'][dow]
      return `${day}(${dowLabel})`
    })
    const maxTemps = daily.map((d) => d.temperatureMax)
    const minTemps = daily.map((d) => d.temperatureMin)
    const avgTemps = daily.map((d) => Math.round(d.temperatureAvg * 10) / 10)
    const precip = daily.map((d) => d.precipitationTotal)

    return {
      grid: { top: 40, right: 50, bottom: 30, left: 50, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: ct.bg2,
        borderColor: ct.grid,
        textStyle: { color: ct.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const items = params as {
            name: string
            value: number
            seriesName: string
            marker: string
          }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          let html = `<b>${items[0].name}</b><br/>`
          for (const item of items) {
            if (item.seriesName === 'band') continue
            const unit = item.seriesName === '降水量' ? 'mm' : '°C'
            html += `${item.marker} ${item.seriesName}: <b>${item.value}${unit}</b><br/>`
          }
          return html
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ['最高気温', '平均気温', '最低気温', '降水量'],
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          fontSize: 10,
          color: ct.textMuted,
          interval: 0,
          rotate: days.length > 20 ? 45 : 0,
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '気温 (°C)',
          nameTextStyle: { fontSize: 10, color: ct.textMuted },
          axisLabel: { fontSize: 10, color: ct.textMuted, formatter: '{value}°' },
          splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' } },
        },
        {
          type: 'value',
          name: '降水量 (mm)',
          nameTextStyle: { fontSize: 10, color: ct.textMuted },
          axisLabel: { fontSize: 10, color: ct.textMuted },
          splitLine: { show: false },
          inverse: true,
          max: (v: { max: number }) => Math.max(v.max * 3, 10),
        },
      ],
      series: [
        // 最低気温（透明帯の下）
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
        // 最高-最低の帯
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
        {
          name: '最高気温',
          type: 'line',
          data: maxTemps,
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true,
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
        {
          name: '降水量',
          type: 'bar',
          yAxisIndex: 1,
          data: precip,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.7)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.2)' },
              ],
            },
            borderRadius: [2, 2, 0, 0],
          },
          barMaxWidth: 16,
        },
      ],
    }
  }, [daily, year, month, ct])

  if (daily.length === 0) return null

  return <EChart option={option} height={320} ariaLabel="月間気温推移チャート" />
})
