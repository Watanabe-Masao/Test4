/** DailySalesChart 描画コンポーネント — ECharts による日別チャート描画のみを担う */
import { memo, useMemo, useRef, useCallback } from 'react'
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
  /** シングルクリック → 日別ドリルダウン分析（ダブルクリックと判別） */
  onDayClick?: (day: number) => void
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
  weatherDaily,
  prevYearWeatherDaily,
  dowOffset = 0,
  year,
  month,
  rightAxisMode = 'quantity',
  maOverlays,
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
    if (view !== 'standard' || !showMovingAverage || !maOverlays) return baseOption

    const toMaData = (series: readonly { dateKey: string; value: number | null }[] | undefined) => {
      if (!series?.length) return null
      return days.map((day) => {
        const dayStr = String(day).padStart(2, '0')
        const monthStr = month ? String(month).padStart(2, '0') : '01'
        const dateKey = `${year ?? 2026}-${monthStr}-${dayStr}`
        const point = series.find((p) => p.dateKey === dateKey)
        return point?.value ?? null
      })
    }

    const maSeries: object[] = []
    const metricLabel = maOverlays.metricLabel ?? ''

    // 売上MA（当年）— インディゴ破線
    const salesCurData = toMaData(maOverlays.salesCur)
    if (salesCurData) {
      maSeries.push({
        name: '売上7日MA',
        type: 'line',
        data: salesCurData,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: '#6366f1' },
        z: 10,
      })
    }

    // 売上MA（前年）— インディゴ点線
    const salesPrevData = toMaData(maOverlays.salesPrev)
    if (salesPrevData) {
      maSeries.push({
        name: '売上7日MA(前年)',
        type: 'line',
        data: salesPrevData,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, type: 'dotted', color: '#6366f180' },
        z: 10,
      })
    }

    // 指標MA（当年）— 右軸色破線
    const metricCurData = toMaData(maOverlays.metricCur)
    if (metricCurData && metricLabel) {
      maSeries.push({
        name: `${metricLabel}7日MA`,
        type: 'line',
        data: metricCurData,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: '#06b6d4' },
        yAxisIndex: needRightAxis ? 1 : 0,
        z: 10,
      })
    }

    // 指標MA（前年）— 右軸色点線
    const metricPrevData = toMaData(maOverlays.metricPrev)
    if (metricPrevData && metricLabel) {
      maSeries.push({
        name: `${metricLabel}7日MA(前年)`,
        type: 'line',
        data: metricPrevData,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, type: 'dotted', color: '#06b6d480' },
        yAxisIndex: needRightAxis ? 1 : 0,
        z: 10,
      })
    }

    if (maSeries.length === 0) return baseOption

    const existingSeries = (baseOption.series as unknown[]) ?? []
    return Object.assign({}, baseOption, { series: [...existingSeries, ...maSeries] })
  }, [baseOption, view, showMovingAverage, maOverlays, days, year, month, needRightAxis])

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
      if (!onDayRangeSelect) return
      const day = extractDay(params)
      if (day != null) onDayRangeSelect(day, day)
    },
    [onDayRangeSelect, extractDay],
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
      ariaLabel="日別売上チャート"
    />
  )
})
