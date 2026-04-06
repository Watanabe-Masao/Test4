/**
 * WeatherTemperatureChart — 月間気温推移チャート（ECharts）
 *
 * 最高/最低気温のエリア帯 + 平均気温ライン + 降水量バー + 前年比較を表示。
 * X軸に天気アイコン付き。日クリック・選択日ハイライト対応。
 * 天気ページ専用。売上データへの依存なし。
 *
 * option 構築は WeatherTemperatureChart.builders.ts に分離。
 *
 * @responsibility R:chart-view, R:state-machine
 * @epoch 1
 */
import { memo, useMemo, useCallback, useState, useRef } from 'react'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import { detectCenterMonth } from './weatherChartNavigation'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { buildTemperatureChartOption } from './WeatherTemperatureChart.builders'

export type ChartRightMetric = 'precipitation' | 'sunshine' | 'humidity'

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearDaily?: readonly DailyWeatherSummary[]
  readonly selectedDays?: ReadonlySet<string>
  readonly onDayClick?: (dateKey: string) => void
  readonly onDayDblClick?: (dateKey: string) => void
  /** ドラッグ範囲選択（インデックスベース） */
  readonly onDayRangeSelect?: (startIdx: number, endIdx: number) => void
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

  const option = useMemo(
    () =>
      buildTemperatureChartOption({
        daily,
        prevYearMap,
        selectedDays: selectedDays ?? new Set(),
        rightMetric,
        monthBoundaries,
        ct,
      }),
    [daily, ct, prevYearMap, selectedDays, rightMetric, monthBoundaries],
  )

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
      if (startIdx <= endIdx) onDayRangeSelect(startIdx, endIdx)
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
