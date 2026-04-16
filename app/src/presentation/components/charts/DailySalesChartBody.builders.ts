/**
 * DailySalesChartBody — ECharts オプションビルダー
 *
 * 純粋関数のみ。コンポーネント本体から分離（C1: 1ファイル = 1変更理由）。
 *
 * @responsibility R:chart-option
 */
import type { EChartsOption } from 'echarts'
import { standardGrid, lineDefaults } from './builders'
import { type ChartTheme, toAxisYen, toComma, toPct } from './chartTheme'
import type { DailySalesDataResult } from './useDailySalesData'
import type { MovingAverageOverlays } from '@/application/hooks/useMultiMovingAverage'
import {
  buildWeatherMap,
  deriveCompStartDateKey,
  buildXLabels,
  buildWeatherRichStyles,
  buildRightAxisSeries,
  rightAxisFormatter as getRightAxisFormatter,
  ALL_LABELS,
  formatDailyTooltip,
  grad,
  withAlpha,
  pluck,
  type RightAxisMode,
  type DayWeatherInfo,
} from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'

export { buildWeatherMap }

/**
 * 天気マップ関連の 3 useMemo を統合する。
 * weatherMap + compStartKey + prevWeatherMap を一括構築。
 *
 * @responsibility R:chart-option
 */
export function buildWeatherContext(
  weatherDaily: readonly import('@/domain/models/record').DailyWeatherSummary[] | undefined,
  prevYearWeatherDaily: readonly import('@/domain/models/record').DailyWeatherSummary[] | undefined,
  dowOffset: number,
  year: number | undefined,
  month: number | undefined,
): {
  weatherMap: ReadonlyMap<number, DayWeatherInfo>
  prevWeatherMap: ReadonlyMap<number, DayWeatherInfo>
} {
  const weatherMap = buildWeatherMap(weatherDaily)
  const compStartKey = deriveCompStartDateKey(dowOffset, year, month)
  const prevWeatherMap = buildWeatherMap(prevYearWeatherDaily, dowOffset, compStartKey)
  return { weatherMap, prevWeatherMap }
}

/** option 生成の本体  *
 * @responsibility R:chart-option
 */
export function buildOption(
  data: DailySalesDataResult['data'],
  view: ViewType,
  isWf: boolean,
  hasPrev: boolean,
  ct: ChartTheme,
  needRightAxis: boolean,
  wfLegendPayload: readonly { value: string; type: 'rect'; color: string }[] | undefined,
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
      fontSize: hasWeather ? 10 : ct.fontSize.micro,
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
      fontSize: ct.fontSize.micro,
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
      fontSize: ct.fontSize.micro,
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
                fontSize: ct.fontSize.micro,
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
      fontSize: ct.fontSize.label,
      fontFamily: ct.fontFamily,
    },
    formatter: (params: unknown) =>
      formatDailyTooltip(params, weatherMap, toComma, toPct, prevYearWeatherMap),
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
        textStyle: { fontSize: ct.fontSize.micro, fontFamily: ct.fontFamily },
      }
    : {
        bottom: 0,
        textStyle: { fontSize: ct.fontSize.micro, fontFamily: ct.fontFamily },
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
        color: grad(ct.semantic.sales, 0.9, 0.5),
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
          color: grad(ct.semantic.salesPrev, 0.7, 0.3),
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 14,
      })
    }
    const rightColors = {
      cyan: ct.semantic.quantity,
      orange: ct.semantic.purchaseCost,
      danger: ct.semantic.discount,
      primary: ct.semantic.sales,
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
    const bandColors = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return ct.semantic.positive
      return c >= b ? ct.semantic.positive : ct.semantic.negative
    })
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
        color: bandColors[bandColors.length - 1] ?? ct.semantic.positive,
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
        lineStyle: { color: ct.semantic.salesPrev, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.semantic.salesPrev },
        areaStyle: { color: grad(ct.semantic.salesPrev, 0.15, 0.02) },
        symbol: 'none',
        connectNulls: true,
      })
    }
    series.push({
      name: 'budgetCum',
      type: 'line' as const,
      data: budgetVals,
      lineStyle: { color: ct.semantic.budget, width: 2, type: 'dashed' as const },
      itemStyle: { color: ct.semantic.budget },
      areaStyle: { color: grad(ct.semantic.budget, 0.15, 0.02) },
      symbol: 'none',
      connectNulls: true,
    })
    series.push({
      name: 'currentCum',
      type: 'line' as const,
      data: currentVals,
      lineStyle: { color: ct.semantic.sales, width: 2.5 },
      itemStyle: { color: ct.semantic.sales },
      areaStyle: { color: grad(ct.semantic.sales, 0.3, 0.02) },
      symbol: 'none',
    })
    series.push({
      name: 'discountCum',
      type: 'line' as const,
      yAxisIndex: 1,
      data: pluck(rows, 'discountCum'),
      ...lineDefaults({ color: ct.semantic.discount, width: 2 }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearDiscountCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'prevYearDiscountCum'),
        ...lineDefaults({ color: ct.semantic.discountPrev, dashed: true, width: 1.5 }),
        connectNulls: true,
      })
    }
  }

  // ─── Rate ───
  if (view === 'rate') {
    const budgetRateData = pluck(rows, 'budgetAchievementRate').map((v) =>
      v != null ? Math.round(v * 10000) / 100 : null,
    )
    series.push({
      name: 'budgetRate',
      type: 'line' as const,
      data: budgetRateData,
      lineStyle: { color: ct.semantic.budget, width: 2.5 },
      itemStyle: { color: ct.semantic.budget },
      symbol: 'none',
      smooth: true,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: ct.semantic.budget, opacity: 0.4, type: 'dashed' as const },
        data: [{ yAxis: 100 }],
        label: { formatter: '100%', fontSize: ct.fontSize.micro },
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
        lineStyle: { color: ct.semantic.salesPrev, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.semantic.salesPrev },
        symbol: 'none',
        smooth: true,
      })
    }
  }

  // ─── Difference ───
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
        itemStyle: { color: withAlpha(ct.semantic.positive, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyDown',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyDown'),
        itemStyle: { color: withAlpha(ct.semantic.negative, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyCum',
        type: 'line' as const,
        data: pluck(rows, 'wfYoyCum'),
        ...lineDefaults({ color: ct.semantic.sales, dashed: true, width: 1.5 }),
        connectNulls: true,
      },
      {
        name: 'discountDiffCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'discountDiffCum'),
        ...lineDefaults({ color: ct.semantic.discount, width: 1.5 }),
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

/** 移動平均 overlay series を baseOption に追加する  *
 * @responsibility R:chart-option
 */
export function buildMAOverlay(
  baseOption: EChartsOption,
  maOverlays: MovingAverageOverlays,
  days: readonly (string | number)[],
  ct: ChartTheme,
  needRightAxis: boolean,
): EChartsOption {
  const toMaData = (
    series: readonly { date: { day: number }; value: number | null }[] | undefined,
  ) => {
    if (!series?.length) return null
    const byDay = new Map<number, number | null>()
    for (const p of series) {
      byDay.set(p.date.day, p.value)
    }
    const result = days.map((day) => byDay.get(day as number) ?? null)
    return result.some((v) => v != null) ? result : null
  }

  const maSeries: object[] = []
  const metricLabel = maOverlays.metricLabel ?? ''
  // MA 系列は raw 線（右軸 quantity/customers は ct.semantic.quantity = sky blue）と
  // 視覚的に衝突しないよう、左右両軸とも movingAverage 色（indigo）で統一する。
  // 左軸の sales bar とは線/棒で形状が異なるため重なっても識別可能。
  // 右軸の raw line（dashed sky blue）と区別するため、metric MA は別色 indigo を使う。
  const maColorPrimary = ct.semantic.movingAverage
  const maColorMetric = ct.semantic.movingAverageMetric

  // 視覚的区別ルール:
  //   - MA 当年: solid（raw current=solid と区別するため色は MA 専用 indigo）
  //   - MA 前年: dashed + alpha 0.7（raw prev=dashed sky blue と区別するため色 indigo）
  // raw line（右軸）は sky blue 系、MA line は indigo 系で配色を分けるので、
  // 同じ dashed パターンでも色で識別可能。
  const salesCurData = toMaData(maOverlays.salesCur)
  if (salesCurData) {
    maSeries.push({
      name: '売上7日MA',
      type: 'line',
      data: salesCurData,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, type: 'solid', color: maColorPrimary },
      z: 10,
    })
  }

  const salesPrevData = toMaData(maOverlays.salesPrev)
  if (salesPrevData) {
    maSeries.push({
      name: '売上7日MA(前年)',
      type: 'line',
      data: salesPrevData,
      smooth: true,
      symbol: 'none',
      // alpha 0.5 + dotted + 1.5px だと白背景でほぼ視認不可だったため強化
      lineStyle: { width: 1.8, type: 'dashed', color: withAlpha(maColorPrimary, 0.7) },
      z: 10,
    })
  }

  const metricCurData = toMaData(maOverlays.metricCur)
  if (metricCurData && metricLabel) {
    maSeries.push({
      name: `${metricLabel}7日MA`,
      type: 'line',
      data: metricCurData,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, type: 'solid', color: maColorMetric },
      yAxisIndex: needRightAxis ? 1 : 0,
      z: 10,
    })
  }

  const metricPrevData = toMaData(maOverlays.metricPrev)
  if (metricPrevData && metricLabel) {
    maSeries.push({
      name: `${metricLabel}7日MA(前年)`,
      type: 'line',
      data: metricPrevData,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.8, type: 'dashed', color: withAlpha(maColorMetric, 0.7) },
      yAxisIndex: needRightAxis ? 1 : 0,
      z: 10,
    })
  }

  if (maSeries.length === 0) return baseOption

  const existingSeries = (baseOption.series as unknown[]) ?? []
  return Object.assign({}, baseOption, { series: [...existingSeries, ...maSeries] })
}
