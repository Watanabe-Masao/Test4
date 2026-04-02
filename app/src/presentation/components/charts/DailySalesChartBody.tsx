/** DailySalesChart 描画コンポーネント — ECharts による日別チャート描画のみを担う */
import { memo, useMemo, useRef, useCallback } from 'react'
import { EChart } from './EChart'
import type { DailySalesDataResult } from './useDailySalesData'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { ChartTheme } from './chartTheme'
import { deriveCompStartDateKey, type RightAxisMode } from './DailySalesChartBodyLogic'
import { buildWeatherMap, buildOption, buildMAOverlay } from './DailySalesChartBody.builders'

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
  /** シングルクリック → 日別ドリルダウン分析（ダブルクリックと判別） */
  onDayClick?: (day: number) => void
  /** ダブルクリック → 時間帯チャートへ自動遷移 */
  onDblClickToTimeSlot?: (day: number) => void
  weatherDaily?: readonly DailyWeatherSummary[]
  prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  /** 同曜日比較時の日オフセット（前年天気の日番号ずらし用） */
  dowOffset?: number
  year?: number
  month?: number
  rightAxisMode?: RightAxisMode
  /** 移動平均 overlay（複数指標 × 当年/前年） */
  maOverlays?: import('@/application/hooks/useMultiMovingAverage').MovingAverageOverlays
  /** 移動平均表示フラグ */
  showMovingAverage?: boolean
  /** 範囲選択後のハイライトを維持する */
  hasActiveSelection?: boolean
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
  onDayClick,
  onDblClickToTimeSlot,
  weatherDaily,
  prevYearWeatherDaily,
  dowOffset = 0,
  year,
  month,
  rightAxisMode = 'quantity',
  maOverlays,
  showMovingAverage,
  hasActiveSelection,
}: Props) {
  const days = useMemo(() => data.map((d) => d.day), [data])

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
    if (view !== 'standard' || !showMovingAverage || !maOverlays) return baseOption
    return buildMAOverlay(baseOption, maOverlays, days, ct, needRightAxis)
  }, [baseOption, view, showMovingAverage, maOverlays, days, needRightAxis, ct])

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

  // シングルクリック / ダブルクリック 判別
  // click → 300ms 待機 → dblclick が来なければ onDayClick 発火
  // dblclick → timer キャンセル → onDayRangeSelect 発火
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const extractDay = useCallback(
    (params: Record<string, unknown>) => {
      const idx = params.dataIndex as number | undefined
      const day = idx != null && idx >= 0 && idx < days.length ? days[idx] : Number(params.name)
      return day != null && !isNaN(day) && day >= 1 ? day : null
    },
    [days],
  )

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick) return
      const day = extractDay(params)
      if (day == null) return
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        onDayClick(day)
      }, 300)
    },
    [onDayClick, extractDay],
  )

  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      const day = extractDay(params)
      if (day == null) return
      // ダブルクリック → 時間帯チャートへ自動遷移
      if (onDblClickToTimeSlot) {
        onDblClickToTimeSlot(day)
      } else if (onDayRangeSelect) {
        onDayRangeSelect(day, day)
      }
    },
    [onDayRangeSelect, onDblClickToTimeSlot, extractDay],
  )

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
      onClick={onDayClick ? handleClick : undefined}
      onDblClick={handleDblClick}
      onBrushEnd={handleBrushEnd}
      keepBrushSelection={hasActiveSelection}
      ariaLabel="日別売上チャート"
    />
  )
})
