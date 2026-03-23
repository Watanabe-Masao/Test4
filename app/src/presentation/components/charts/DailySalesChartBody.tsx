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

  // ブラシ設定を追加（ドラッグ選択機能が有効な場合のみ）
  const option = useMemo(() => {
    if (!onDayRangeSelect) return baseOption
    return {
      ...baseOption,
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
  }, [baseOption, onDayRangeSelect])

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
      ariaLabel="日別売上チャート"
    />
  )
})
