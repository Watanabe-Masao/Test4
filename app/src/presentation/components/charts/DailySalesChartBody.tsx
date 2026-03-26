/** DailySalesChart 描画コンポーネント — ECharts による日別チャート描画のみを担う */
import { memo, useMemo } from 'react'
import { EChart } from './EChart'
import type { DailySalesDataResult } from './useDailySalesData'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { ChartTheme } from './chartTheme'
import { deriveCompStartDateKey, type RightAxisMode } from './DailySalesChartBodyLogic'
import { buildWeatherMap, buildOption } from './DailySalesChartBody.builders'

export type ViewType = 'standard' | 'cumulative' | 'difference' | 'rate'

interface Props {
  data: DailySalesDataResult['data']
  view: ViewType
  isWf: boolean
  hasPrev: boolean
  ct: ChartTheme
  needRightAxis: boolean
  wfLegendPayload: { value: string; type: 'rect'; color: string }[] | undefined
  onDayRangeSelect?: (startDay: number, endDay: number) => void
  weatherDaily?: readonly DailyWeatherSummary[]
  prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  /** 同曜日比較時の日オフセット（前年天気の日番号ずらし用） */
  dowOffset?: number
  year?: number
  month?: number
  rightAxisMode?: RightAxisMode
  /** 移動平均 overlay 系列（temporal handler 由来） */
  movingAverageSeries?: readonly { dateKey: string; value: number | null }[]
  /** 移動平均表示フラグ */
  showMovingAverage?: boolean
}

export const DailySalesChartBody = memo(function DailySalesChartBody({
  data,
  view,
  isWf,
  hasPrev,
  ct,
  needRightAxis,
  wfLegendPayload,
  onDayRangeSelect,
  weatherDaily,
  prevYearWeatherDaily,
  dowOffset = 0,
  year,
  month,
  rightAxisMode = 'quantity',
  movingAverageSeries,
  showMovingAverage,
}: Props) {
  const rows = data as unknown as Record<string, unknown>[]
  const days = useMemo(() => rows.map((d) => d.day as number), [rows])

  const weatherMap = useMemo(() => buildWeatherMap(weatherDaily), [weatherDaily])
  const compStartKey = useMemo(
    () => deriveCompStartDateKey(dowOffset, year, month),
    [dowOffset, year, month],
  )
  const prevWeatherMap = useMemo(
    () => buildWeatherMap(prevYearWeatherDaily, dowOffset, compStartKey),
    [prevYearWeatherDaily, dowOffset, compStartKey],
  )
  const hasWeather = weatherMap.size > 0
  const hasPrevWeather = prevWeatherMap.size > 0
  const baseOption = useMemo(
    () =>
      buildOption(
        data,
        view,
        isWf,
        hasPrev,
        ct,
        needRightAxis,
        wfLegendPayload,
        weatherMap,
        prevWeatherMap,
        year,
        month,
        rightAxisMode,
      ),
    [
      data,
      view,
      isWf,
      hasPrev,
      ct,
      needRightAxis,
      wfLegendPayload,
      weatherMap,
      prevWeatherMap,
      year,
      month,
      rightAxisMode,
    ],
  )

  // MA overlay を追加（standard ビュー + showMovingAverage のみ）
  const optionWithMA = useMemo(() => {
    if (view !== 'standard' || !showMovingAverage || !movingAverageSeries?.length) return baseOption
    // dateKey → day の Map を構築
    const dayMap = new Map<string, number>()
    for (const row of rows) {
      const r = row as { day: number; dateKey?: string }
      if (r.dateKey) dayMap.set(r.dateKey, r.day)
    }
    // MA series を ECharts series data に変換（日番号順）
    const maData = days.map((day) => {
      const dayStr = String(day).padStart(2, '0')
      const monthStr = month ? String(month).padStart(2, '0') : '01'
      const dateKey = `${year ?? 2026}-${monthStr}-${dayStr}`
      const point = movingAverageSeries.find((p) => p.dateKey === dateKey)
      return point?.value ?? null
    })

    const existingSeries = (baseOption.series as unknown[]) ?? []
    return Object.assign({}, baseOption, {
      series: [
        ...existingSeries,
        {
          name: '売上7日移動平均',
          type: 'line',
          data: maData,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, type: 'dashed', color: '#6366f1' },
          z: 10,
        },
      ],
    })
  }, [baseOption, view, showMovingAverage, movingAverageSeries, rows, days, year, month])

  // ブラシ設定を追加（ドラッグ選択機能が有効な場合のみ）
  const option = useMemo(() => {
    if (!onDayRangeSelect) return optionWithMA
    return {
      ...optionWithMA,
      brush: {
        toolbox: [],
        xAxisIndex: 0,
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(59,130,246,0.15)',
          borderColor: 'rgba(59,130,246,0.5)',
        },
        throttleType: 'debounce' as const,
        throttleDelay: 100,
      },
    }
  }, [optionWithMA, onDayRangeSelect])

  // 単日クリック → 1日分の range として通知（dataIndex で days から日付取得）
  const handleClick = useMemo(() => {
    if (!onDayRangeSelect) return undefined
    return (params: Record<string, unknown>) => {
      const idx = params.dataIndex as number | undefined
      const day = idx != null && idx >= 0 && idx < days.length ? days[idx] : Number(params.name)
      if (day != null && !isNaN(day) && day >= 1) onDayRangeSelect(day, day)
    }
  }, [onDayRangeSelect, days])

  // ブラシ選択完了 → 日付範囲を通知
  const handleBrushEnd = useMemo(() => {
    if (!onDayRangeSelect) return undefined
    return (params: Record<string, unknown>) => {
      const areas = (params as { areas?: { coordRange?: number[] }[] }).areas
      if (!areas || areas.length === 0) return
      const range = areas[0].coordRange
      if (!range || range.length < 2) return
      // coordRange はカテゴリ軸のインデックス（0-based）
      const startIdx = Math.max(0, Math.min(range[0], range[1]))
      const endIdx = Math.min(days.length - 1, Math.max(range[0], range[1]))
      const startDay = days[startIdx]
      const endDay = days[endIdx]
      if (startDay != null && endDay != null) {
        onDayRangeSelect(startDay, endDay)
      }
    }
  }, [onDayRangeSelect, days])

  return (
    <EChart
      option={option}
      height={hasPrevWeather ? 400 : hasWeather ? 360 : 300}
      onClick={handleClick}
      onBrushEnd={handleBrushEnd}
      enableBrushClickEmulation
      ariaLabel="日別売上チャート"
    />
  )
})
