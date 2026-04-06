/**
 * WeatherTemperatureChart — 月間気温推移チャート（ECharts）
 *
 * 最高/最低気温のエリア帯 + 平均気温ライン + 降水量バー（下から上へ） + 前年比較を表示。
 * X軸に天気アイコン付き。日クリック・選択日ハイライト対応。
 * 天気ページ専用。売上データへの依存なし。
 */
import { memo, useMemo, useCallback, useState, useRef } from 'react'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import { detectCenterMonth, calcInitialZoomRange } from './weatherChartNavigation'
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
  readonly selectedDays?: ReadonlySet<number>
  readonly onDayClick?: (dateKey: string) => void
  readonly onDayDblClick?: (dateKey: string) => void
  readonly onDayRangeSelect?: (startDay: number, endDay: number) => void
  /** 3ヶ月連続スクロール: 月境界情報 */
  readonly monthBoundaries?: import('@/application/hooks/useWeatherTriple').MonthBoundaries
  /** 月の中心がシフトしたときに発火 */
  readonly onMonthChange?: (direction: -1 | 1) => void
  /** ヘッダ行に追加表示する要素（曜日フィルタ等） */
  readonly headerExtra?: React.ReactNode
}

const METRIC_OPTIONS: readonly { key: ChartRightMetric; label: string }[] = [
  { key: 'precipitation', label: '降水量' },
  { key: 'sunshine', label: '日照' },
  { key: 'humidity', label: '湿度' },
]

export const WeatherTemperatureChart = memo(function WeatherTemperatureChart({
  daily,
  prevYearDaily,
  selectedDays,
  onDayClick,
  onDayDblClick,
  onDayRangeSelect,
  monthBoundaries,
  onMonthChange,
  headerExtra,
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

  const option = useMemo(() => {
    const zoom = monthBoundaries ? calcInitialZoomRange(monthBoundaries) : null
    const zoomStart = zoom?.start ?? 0
    const zoomEnd = zoom?.end ?? 100
    if (daily.length === 0) return {}

    const days: string[] = []
    const dayNumbers: number[] = []

    for (const d of daily) {
      const day = Number(d.dateKey.split('-')[2])
      const dMonth = Number(d.dateKey.slice(5, 7))
      const dYear = Number(d.dateKey.slice(0, 4))
      const dow = new Date(dYear, dMonth - 1, day).getDay()
      const dowLabel = ['日', '月', '火', '水', '木', '金', '土'][dow]
      const icon = WEATHER_ICONS[categorizeWeatherCode(d.dominantWeatherCode)]
      // 月初日には月名ラベルを追加
      const monthPrefix = day === 1 ? `{monthLabel|${dMonth}月}\n` : ''
      // 前年天気アイコン（あれば 2 段目に表示）
      const prevDay = prevYearMap?.get(day)
      const prevIcon = prevDay
        ? `\n{prev|${WEATHER_ICONS[categorizeWeatherCode(prevDay.dominantWeatherCode)]}}`
        : ''
      days.push(`${monthPrefix}${day}(${dowLabel})\n{icon|${icon}}${prevIcon}`)
      dayNumbers.push(day)
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
    // 軸の最大値は実データ範囲に合わせる（目盛りが無駄に広がらない）
    const rightAxisMax = rightCeil

    // Selected days highlight
    const selectedSet = selectedDays ?? new Set<number>()
    const isSelected = (idx: number) => selectedSet.has(dayNumbers[idx])

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
          axisLabel: {
            fontSize: 10,
            color: ct.textMuted,
            formatter: '{value}',
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
          ...(selectedSet.size > 0
            ? {
                markArea: {
                  silent: true,
                  data: buildMarkAreaRanges(dayNumbers, selectedSet),
                },
              }
            : {}),
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
      // 3ヶ月連続スクロール: dataZoom inside mode
      ...(monthBoundaries
        ? {
            dataZoom: [
              {
                type: 'inside',
                xAxisIndex: 0,
                start: zoomStart,
                end: zoomEnd,
                zoomLock: true, // ズーム禁止（スクロールのみ）
                moveOnMouseWheel: true,
              },
            ],
          }
        : {}),
    }
  }, [daily, ct, prevYearMap, selectedDays, rightMetric, monthBoundaries])

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

  const handleBrushEnd = useMemo(() => {
    if (!onDayRangeSelect) return undefined
    return (params: Record<string, unknown>) => {
      const areas = (params as { areas?: { coordRange?: number[] }[] }).areas
      if (!areas || areas.length === 0) return
      const range = areas[0].coordRange
      if (!range || range.length < 2) return
      const startIdx = Math.max(0, Math.min(range[0], range[1]))
      const endIdx = Math.min(daily.length - 1, Math.max(range[0], range[1]))
      const startDay = Number(daily[startIdx]?.dateKey?.split('-')[2])
      const endDay = Number(daily[endIdx]?.dateKey?.split('-')[2])
      if (startDay > 0 && endDay > 0) onDayRangeSelect(startDay, endDay)
    }
  }, [onDayRangeSelect, daily])

  // dataZoom → 月シフト検出（debounce 300ms）
  const monthShiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleDataZoom = useCallback(
    (params: Record<string, unknown>) => {
      if (!onMonthChange || !monthBoundaries) return
      const start = (params['start'] as number) ?? 0
      const end = (params['end'] as number) ?? 100
      if (monthShiftTimerRef.current) clearTimeout(monthShiftTimerRef.current)
      monthShiftTimerRef.current = setTimeout(() => {
        const dir = detectCenterMonth(start, end, monthBoundaries)
        if (dir !== 0) onMonthChange(dir)
      }, 300)
    },
    [onMonthChange, monthBoundaries],
  )

  // ブラシ設定追加
  const brushOption = useMemo(() => {
    if (!onDayRangeSelect) return option
    return {
      ...option,
      brush: {
        toolbox: [],
        xAxisIndex: 0,
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(59,130,246,0.12)',
          borderColor: 'rgba(59,130,246,0.4)',
        },
        throttleType: 'debounce' as const,
        throttleDelay: 100,
      },
    }
  }, [option, onDayRangeSelect])

  if (daily.length === 0) return null

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {headerExtra}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
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
      </div>
      <EChart
        option={brushOption as EChartsOption}
        height={440}
        onClick={handleClick}
        onDataZoom={monthBoundaries ? handleDataZoom : undefined}
        onDblClick={handleDblClick}
        onBrushEnd={handleBrushEnd}
        ariaLabel="月間気温推移チャート"
      />
    </div>
  )
})

/** 選択日セットから連続範囲の markArea データを生成 */
function buildMarkAreaRanges(dayNumbers: number[], selected: ReadonlySet<number>): unknown[][] {
  const style = { color: 'rgba(59,130,246,0.08)' }
  const areas: unknown[][] = []
  let rangeStart = -1
  for (let i = 0; i < dayNumbers.length; i++) {
    if (selected.has(dayNumbers[i])) {
      if (rangeStart < 0) rangeStart = i
    } else {
      if (rangeStart >= 0) {
        areas.push([{ xAxis: rangeStart }, { xAxis: i - 1, itemStyle: style }])
        rangeStart = -1
      }
    }
  }
  if (rangeStart >= 0) {
    areas.push([{ xAxis: rangeStart }, { xAxis: dayNumbers.length - 1, itemStyle: style }])
  }
  return areas
}
