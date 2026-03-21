/** DailySalesChart 描画コンポーネント — ECharts による日別チャート描画のみを担う */
import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { standardGrid, lineDefaults } from './builders'
import { type ChartTheme, toAxisYen, toComma, toPct } from './chartTheme'
import type { DailySalesDataResult } from './useDailySalesData'
import type { DailyWeatherSummary } from '@/domain/models/record'
import {
  buildWeatherMap,
  buildXLabels,
  buildWeatherRichStyles,
  buildRightAxisSeries,
  rightAxisFormatter as getRightAxisFormatter,
  ALL_LABELS,
  HIDDEN_NAMES,
  PERCENT_SERIES,
  TEMPERATURE_SERIES,
  grad,
  withAlpha,
  pluck,
  type RightAxisMode,
  type DayWeatherInfo,
} from './DailySalesChartBodyLogic'

export type ViewType = 'standard' | 'cumulative' | 'difference' | 'rate'

interface Props {
  data: DailySalesDataResult['data']
  view: ViewType
  isWf: boolean
  hasPrev: boolean
  ct: ChartTheme
  needRightAxis: boolean
  wfLegendPayload: { value: string; type: 'rect'; color: string }[] | undefined
  /** バークリックまたはドラッグ選択で日付範囲を通知 */
  onDayRangeSelect?: (startDay: number, endDay: number) => void
  /** 天気データ（X軸に天気アイコン+気温を表示） */
  weatherDaily?: readonly DailyWeatherSummary[]
  /** 前年天気データ（X軸に前年天気+気温線を表示） */
  prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  /** 当月の年（曜日算出用） */
  year?: number
  /** 当月の月（曜日算出用） */
  month?: number
  /** 右軸の表示モード（デフォルト: quantity=点数） */
  rightAxisMode?: RightAxisMode
}

/** option 生成の本体 */
function buildOption(
  data: DailySalesDataResult['data'],
  view: ViewType,
  isWf: boolean,
  hasPrev: boolean,
  ct: ChartTheme,
  needRightAxis: boolean,
  wfLegendPayload: Props['wfLegendPayload'],
  weatherMap?: ReadonlyMap<number, DayWeatherInfo>,
  prevYearWeatherMap?: ReadonlyMap<number, DayWeatherInfo>,
  year?: number,
  month?: number,
  rightAxisMode: RightAxisMode = 'quantity',
): EChartsOption {
  const rows = data as unknown as Record<string, unknown>[]
  const days = rows.map((d) => d.day as string | number)
  const hasWeather = weatherMap != null && weatherMap.size > 0
  const hasPrevWeather = prevYearWeatherMap != null && prevYearWeatherMap.size > 0
  const xLabels = buildXLabels(days, weatherMap ?? new Map(), prevYearWeatherMap, year, month)

  // ── 共通軸 ──
  const xAxis: EChartsOption['xAxis'] = {
    type: 'category' as const,
    data: xLabels,
    axisLabel: {
      color: ct.textMuted,
      fontSize: hasWeather ? 10 : ct.fontSize.xs,
      fontFamily: ct.monoFamily,
      interval: 0,
      lineHeight: hasWeather ? 16 : undefined,
      ...(hasWeather ? { rich: buildWeatherRichStyles() } : {}),
    },
    axisLine: { lineStyle: { color: ct.grid } },
    axisTick: { show: false },
  }

  const yAxisLeft = {
    type: 'value' as const,
    axisLabel: {
      formatter: (v: number) => toAxisYen(v),
      color: ct.textMuted,
      fontSize: ct.fontSize.xs,
      fontFamily: ct.monoFamily,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const },
    },
  }

  const yAxisPercent = {
    type: 'value' as const,
    axisLabel: {
      formatter: (v: number) => `${v.toFixed(1)}%`,
      color: ct.textMuted,
      fontSize: ct.fontSize.xs,
      fontFamily: ct.monoFamily,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const },
    },
  }

  const rightFmt =
    view === 'standard' ? getRightAxisFormatter(rightAxisMode) : (v: number) => toAxisYen(v)

  const yAxes: EChartsOption['yAxis'] =
    view === 'rate'
      ? yAxisPercent
      : needRightAxis
        ? [
            yAxisLeft,
            {
              type: 'value' as const,
              position: 'right' as const,
              axisLabel: {
                formatter: rightFmt,
                color: ct.textMuted,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              },
              axisLine: { show: false },
              axisTick: { show: false },
              splitLine: { show: false },
            },
          ]
        : yAxisLeft

  // ── ツールチップ ──
  const tooltip: EChartsOption['tooltip'] = {
    trigger: 'axis' as const,
    backgroundColor: ct.bg2,
    borderColor: ct.grid,
    textStyle: {
      color: ct.text,
      fontSize: ct.fontSize.sm,
      fontFamily: ct.fontFamily,
    },
    formatter: (params: unknown) => {
      const items = params as {
        seriesName: string
        value: number | null
        color: string
        marker: string
      }[]
      if (!Array.isArray(items) || items.length === 0) return ''
      const day = (items[0] as unknown as { name: string }).name
      const header = `<div style="font-weight:600;margin-bottom:4px">${day}日</div>`
      const lines = items
        .filter((item) => !HIDDEN_NAMES.has(item.seriesName))
        .map((item) => {
          const label = ALL_LABELS[item.seriesName] ?? item.seriesName
          const val =
            item.value == null
              ? '-'
              : PERCENT_SERIES.has(item.seriesName)
                ? toPct(item.value / 100)
                : TEMPERATURE_SERIES.has(item.seriesName)
                  ? `${item.value}°C`
                  : toComma(item.value)
          return (
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `${item.marker}<span>${label}</span>` +
            `<span style="font-weight:600;font-family:monospace">${val}</span></div>`
          )
        })
        .join('')
      return header + lines
    },
  }

  // ── 凡例 ──
  const legendData: { name: string; icon?: string; itemStyle?: object }[] = []
  if (wfLegendPayload) {
    for (const item of wfLegendPayload) {
      legendData.push({
        name: ALL_LABELS[item.value] ?? item.value,
        icon: 'rect',
        itemStyle: { color: item.color },
      })
    }
  }
  const legend: EChartsOption['legend'] = wfLegendPayload
    ? {
        data: legendData,
        bottom: 0,
        textStyle: { fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily },
      }
    : {
        bottom: 0,
        textStyle: { fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily },
        formatter: (name: string) => ALL_LABELS[name] ?? name,
      }

  const series: EChartsOption['series'] = []
  // ─── Standard ───
  if (view === 'standard') {
    series.push({
      name: 'sales',
      type: 'bar' as const,
      yAxisIndex: 0,
      data: pluck(rows, 'sales'),
      itemStyle: {
        color: grad(ct.colors.primary, 0.9, 0.5),
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 18,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearSales',
        type: 'bar' as const,
        yAxisIndex: 0,
        data: pluck(rows, 'prevYearSales'),
        itemStyle: {
          color: grad(ct.colors.slate, 0.7, 0.3),
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 14,
      })
    }
    // 右軸シリーズ（モジュール化されたビルダーで生成）
    const rightColors = {
      cyan: ct.colors.cyan,
      orange: ct.colors.orange,
      danger: ct.colors.danger,
      primary: ct.colors.primary,
    }
    series.push(
      ...buildRightAxisSeries(
        rightAxisMode,
        rows,
        days,
        hasPrev,
        rightColors,
        weatherMap ?? new Map(),
        prevYearWeatherMap,
      ),
    )
  }

  // ─── Cumulative ───
  if (view === 'cumulative') {
    const budgetVals = pluck(rows, 'budgetCum')
    const currentVals = pluck(rows, 'currentCum')
    // 上側（max）と下側（min）で band を構成
    const bandUpper = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return null
      return Math.max(b, c)
    })
    const bandLower = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return null
      return Math.min(b, c)
    })
    // 帯の色: 実績 >= 予算 なら success、実績 < 予算 なら danger
    const bandColors = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return ct.colors.success
      return c >= b ? ct.colors.success : ct.colors.danger
    })
    // 帯の下半分（透明エリアで底上げ）
    series.push({
      name: 'bandLower',
      type: 'line' as const,
      data: bandLower,
      lineStyle: { width: 0 },
      itemStyle: { color: 'transparent' },
      areaStyle: { color: 'transparent' },
      symbol: 'none',
      stack: 'band',
      silent: true,
    })
    // 帯の上半分（下半分からの差分を塗りつぶし）
    series.push({
      name: 'bandUpper',
      type: 'line' as const,
      data: bandUpper.map((u, i) => {
        const l = bandLower[i]
        if (u == null || l == null) return null
        return u - l
      }),
      lineStyle: { width: 0 },
      itemStyle: {
        color: bandColors[bandColors.length - 1] ?? ct.colors.success,
      },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: bandColors.flatMap((c, i) => [
            { offset: Math.max(0, i / bandColors.length), color: withAlpha(c, 0.15) },
            { offset: Math.min(1, (i + 1) / bandColors.length), color: withAlpha(c, 0.15) },
          ]),
        },
      },
      symbol: 'none',
      stack: 'band',
      silent: true,
    })

    if (hasPrev) {
      series.push({
        name: 'prevYearCum',
        type: 'line' as const,
        data: pluck(rows, 'prevYearCum'),
        lineStyle: { color: ct.colors.slate, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        areaStyle: { color: grad(ct.colors.slate, 0.15, 0.02) },
        symbol: 'none',
        connectNulls: true,
      })
    }
    series.push({
      name: 'budgetCum',
      type: 'line' as const,
      data: budgetVals,
      lineStyle: { color: ct.colors.success, width: 2, type: 'dashed' as const },
      itemStyle: { color: ct.colors.success },
      areaStyle: { color: grad(ct.colors.success, 0.15, 0.02) },
      symbol: 'none',
      connectNulls: true,
    })
    series.push({
      name: 'currentCum',
      type: 'line' as const,
      data: currentVals,
      lineStyle: { color: ct.colors.primary, width: 2.5 },
      itemStyle: { color: ct.colors.primary },
      areaStyle: { color: grad(ct.colors.primary, 0.3, 0.02) },
      symbol: 'none',
    })
    // 売変累計（右軸）
    series.push({
      name: 'discountCum',
      type: 'line' as const,
      yAxisIndex: 1,
      data: pluck(rows, 'discountCum'),
      ...lineDefaults({ color: ct.colors.danger, width: 2 }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearDiscountCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'prevYearDiscountCum'),
        ...lineDefaults({ color: ct.colors.orange, dashed: true, width: 1.5 }),
        connectNulls: true,
      })
    }
  }

  // ─── Rate: 予算達成率・前年比の推移（%表示） ───
  // 率は domain/calculations の calculateAchievementRate / calculateYoYRatio で
  // 事前計算済み（BaseDayItem.budgetAchievementRate / yoyRatio）。
  // ここでは表示用の % 変換（×100）のみ行う。
  if (view === 'rate') {
    const budgetRateData = pluck(rows, 'budgetAchievementRate').map((v) =>
      v != null ? Math.round(v * 10000) / 100 : null,
    )
    series.push({
      name: 'budgetRate',
      type: 'line' as const,
      data: budgetRateData,
      lineStyle: { color: ct.colors.success, width: 2.5 },
      itemStyle: { color: ct.colors.success },
      symbol: 'none',
      smooth: true,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: ct.colors.success, opacity: 0.4, type: 'dashed' as const },
        data: [{ yAxis: 100 }],
        label: { formatter: '100%', fontSize: ct.fontSize.xs },
      },
    })

    if (hasPrev) {
      const prevRateData = pluck(rows, 'yoyRatio').map((v) =>
        v != null ? Math.round(v * 10000) / 100 : null,
      )
      series.push({
        name: 'prevYearRate',
        type: 'line' as const,
        data: prevRateData,
        lineStyle: { color: ct.colors.slate, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        symbol: 'none',
        smooth: true,
      })
    }
  }

  // ─── Difference: 差分ウォーターフォール + 売変差累計（右軸） ───
  if (view === 'difference' && isWf) {
    series.push(
      {
        name: 'wfYoyBase',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyBase'),
        itemStyle: { color: 'transparent' },
        barMaxWidth: 16,
        emphasis: { disabled: true },
      },
      {
        name: 'wfYoyUp',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyUp'),
        itemStyle: { color: withAlpha(ct.colors.success, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyDown',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyDown'),
        itemStyle: { color: withAlpha(ct.colors.danger, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyCum',
        type: 'line' as const,
        data: pluck(rows, 'wfYoyCum'),
        ...lineDefaults({ color: ct.colors.primary, dashed: true, width: 1.5 }),
        connectNulls: true,
      },
      // 売変差累計（右軸）
      {
        name: 'discountDiffCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'discountDiffCum'),
        ...lineDefaults({ color: ct.colors.orange, width: 1.5 }),
        connectNulls: true,
      },
    )
  }

  // ─── WF 用ゼロ基準線 ───
  if (isWf && series.length > 0) {
    ;(series[series.length - 1] as Record<string, unknown>).markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: { color: ct.grid, opacity: 0.5, type: 'solid' as const },
      data: [{ yAxis: 0 }],
    }
  }

  return {
    grid: {
      ...standardGrid(),
      top: 4,
      right: 12,
      left: 0,
      bottom: hasPrevWeather ? 72 : hasWeather ? 56 : 30,
    },
    tooltip,
    legend,
    xAxis,
    yAxis: yAxes,
    series,
  }
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
  year,
  month,
  rightAxisMode = 'quantity',
}: Props) {
  const rows = data as unknown as Record<string, unknown>[]
  const days = useMemo(() => rows.map((d) => d.day as number), [rows])

  const weatherMap = useMemo(() => buildWeatherMap(weatherDaily), [weatherDaily])
  const prevWeatherMap = useMemo(
    () => buildWeatherMap(prevYearWeatherDaily),
    [prevYearWeatherDaily],
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
