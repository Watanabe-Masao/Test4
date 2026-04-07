/**
 * TimeSlotChart の ECharts option 構築 — 純粋関数
 *
 * Controller（TimeSlotChart.tsx）から chartOption の useMemo 本体を抽出。
 * theme と lineMode と天気データを受けて EChartsOption を返す。
 * React に依存しない純粋関数。
 * @responsibility R:chart-option
 */
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma, toPct } from './chartTheme'
import { yenYAxis } from './echartsOptionBuilders'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import { tooltipBase } from './builders/tooltip'
import { valueYAxis } from './builders'
import { palette, chartFontSize } from '@/presentation/theme/tokens'
import type { EChartsOption } from './EChart'
import type { LineMode } from './TimeSlotChartView'
/** chartData の行型 */
interface ChartRow {
  readonly [key: string]: string | number | null
}
import { GRID_LEFT, GRID_RIGHT } from './TimeSlotChartView'

// ── Types ──

export interface WeatherMapEntry {
  readonly temp: number
  readonly precip: number
}

export interface TimeSlotChartOptionInput {
  readonly chartData: readonly ChartRow[]
  readonly hours: string[]
  readonly curLabel: string
  readonly compLabel: string
  readonly showPrev: boolean
  readonly theme: AppTheme
  readonly lineMode: LineMode
  readonly curWeatherMap: ReadonlyMap<number, WeatherMapEntry>
  readonly prevWeatherMap: ReadonlyMap<number, WeatherMapEntry>
  /** コアタイム範囲（markArea 表示用） */
  readonly coreTimeRange?: { readonly startHour: number; readonly endHour: number } | null
  /** ピーク時間帯（markPoint 表示用） */
  readonly peakHour?: number | null
  /** 前年コアタイム範囲 */
  readonly prevCoreTimeRange?: { readonly startHour: number; readonly endHour: number } | null
  /** 前年ピーク時間帯 */
  readonly prevPeakHour?: number | null
}

// ── カスタムツールチップ ──

type TooltipItem = {
  seriesName: string
  value: number | null | undefined
  marker: string
  axisValue?: string
  name?: string
}

const fmtYen = (v: number) => `${Math.round(v).toLocaleString('ja-JP')}円`
const fmtQty = (v: number) => `${Math.round(v).toLocaleString('ja-JP')}点`
const fmtDiff = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ja-JP')}円`
const fmtQtyDiff = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ja-JP')}点`

/**
 * 時間帯別チャート用ツールチップ。
 *
 * 当年売上 / 前年比 を横並びで表示し、前年売上 / 前年差 を次の行に。
 * 点数モードの場合は区切り線の下に点数も同様に表示。
 */
function buildTimeSlotTooltip(
  theme: AppTheme,
  showPrev: boolean,
  curLabel: string,
  compLabel: string,
  lineMode: LineMode,
) {
  return {
    ...tooltipBase(theme),
    formatter: (params: unknown) => {
      const items = params as TooltipItem[]
      if (!Array.isArray(items) || items.length === 0 || !items[0]) return ''
      const title = items[0].axisValue ?? items[0].name ?? ''
      const byName = new Map<string, number>()
      for (const item of items) {
        if (item.value != null) byName.set(item.seriesName, item.value)
      }

      const isQtyMode = lineMode === 'quantity'
      let html = `<div style="font-weight:600;margin-bottom:6px">${title}</div>`

      // ── 売上セクション ──
      const curSalesKey = showPrev ? `${curLabel}売上` : '売上金額'
      const prevSalesKey = `${compLabel}売上`
      const curSales = byName.get(curSalesKey)
      const prevSales = byName.get(prevSalesKey)

      if (curSales != null) {
        const yoyStr =
          showPrev && prevSales != null && prevSales > 0
            ? `&emsp;前年比 ${toPct(calculateYoYRatio(curSales, prevSales))}`
            : ''
        html +=
          `<div style="display:flex;justify-content:space-between;gap:8px">` +
          `<span>● ${curSalesKey}</span>` +
          `<span style="font-weight:600;font-family:monospace">${fmtYen(curSales)}${yoyStr}</span></div>`
      }
      if (showPrev && prevSales != null) {
        const diffStr = curSales != null ? `&emsp;前年差 ${fmtDiff(curSales - prevSales)}` : ''
        html +=
          `<div style="display:flex;justify-content:space-between;gap:8px;opacity:0.7">` +
          `<span>○ ${prevSalesKey}</span>` +
          `<span style="font-weight:600;font-family:monospace">${fmtYen(prevSales)}${diffStr}</span></div>`
      }

      // ── 点数セクション ──
      if (isQtyMode) {
        const curQtyKey = showPrev ? `${curLabel}点数` : '点数'
        const prevQtyKey = `${compLabel}点数`
        const curQty = byName.get(curQtyKey)
        const prevQty = byName.get(prevQtyKey)

        if (curQty != null || prevQty != null) {
          html += `<div style="margin:4px 0;border-top:1px solid ${theme.colors.border};opacity:0.5"></div>`
        }
        if (curQty != null) {
          const qtyYoyStr =
            showPrev && prevQty != null && prevQty > 0
              ? `&emsp;前年比 ${toPct(curQty / prevQty)}`
              : ''
          html +=
            `<div style="display:flex;justify-content:space-between;gap:8px">` +
            `<span>● ${curQtyKey}</span>` +
            `<span style="font-weight:600;font-family:monospace">${fmtQty(curQty)}${qtyYoyStr}</span></div>`
        }
        if (showPrev && prevQty != null) {
          const qtyDiffStr = curQty != null ? `&emsp;前年差 ${fmtQtyDiff(curQty - prevQty)}` : ''
          html +=
            `<div style="display:flex;justify-content:space-between;gap:8px;opacity:0.7">` +
            `<span>○ ${prevQtyKey}</span>` +
            `<span style="font-weight:600;font-family:monospace">${fmtQty(prevQty)}${qtyDiffStr}</span></div>`
        }
      }

      // ── 累積構成比セクション ──
      if (lineMode === 'cumulative') {
        const cumItems = items.filter(
          (item) => item.value != null && item.seriesName.includes('累積構成比'),
        )
        if (cumItems.length > 0) {
          html += `<div style="margin:4px 0;border-top:1px solid ${theme.colors.border};opacity:0.5"></div>`
          for (const item of cumItems) {
            html += `<div>${item.marker} ${item.seriesName}: ${(item.value as number).toFixed(2)}%</div>`
          }
        }
      }

      // ── 天気セクション（気温・降水量） ──
      if (lineMode === 'temperature' || lineMode === 'precipitation') {
        const weatherItems = items.filter(
          (item) =>
            item.value != null &&
            (item.seriesName.includes('気温') || item.seriesName.includes('降水量')),
        )
        if (weatherItems.length > 0) {
          html += `<div style="margin:4px 0;border-top:1px solid ${theme.colors.border};opacity:0.5"></div>`
          for (const item of weatherItems) {
            const val = item.seriesName.includes('気温')
              ? `${(item.value as number).toFixed(1)}°C`
              : `${(item.value as number).toFixed(1)}mm`
            html += `<div>${item.marker} ${item.seriesName}: ${val}</div>`
          }
        }
      }

      return html
    },
  }
}

// ── 降水量軸ポリシー ──

/** 降水量モードの固定軸設定を解決する。0〜5mm を基本とし、大きい値に段階的に拡張。 */
export function resolvePrecipitationAxisRange(maxPrecip: number): {
  min: number
  max: number
  interval: number
} {
  if (maxPrecip <= 5) return { min: 0, max: 5, interval: 1 }
  if (maxPrecip <= 10) return { min: 0, max: 10, interval: 2 }
  return { min: 0, max: 20, interval: 5 }
}

// ── 気温軸ポリシー ──

/** 温度帯の定義 */
export interface TemperatureBand {
  /** 帯の下限（°C） */
  readonly min: number
  /** 帯の上限（°C） */
  readonly max: number
  /** 帯の表示ラベル */
  readonly label: string
  /** 帯の背景色（RGBA 文字列） */
  readonly color: string
}

/** 固定の温度帯定義。季節に関わらず同じ境界を使う。 */
export const TEMPERATURE_BANDS: readonly TemperatureBand[] = [
  { min: -40, max: 0, label: '寒冷', color: 'rgba(59,130,246,0.06)' },
  { min: 0, max: 10, label: '低温', color: 'rgba(96,165,250,0.05)' },
  { min: 10, max: 20, label: '涼快', color: 'rgba(52,211,153,0.05)' },
  { min: 20, max: 28, label: '暖', color: 'rgba(251,191,36,0.05)' },
  { min: 28, max: 60, label: '高温', color: 'rgba(239,68,68,0.06)' },
]

/** 温度帯ごとの線色。背景色より濃い不透明色で視認性を確保する。 */
export const TEMPERATURE_LINE_COLORS: Record<string, string> = {
  寒冷: '#2563eb', // blue-600
  低温: '#3b82f6', // blue-500
  涼快: '#10b981', // emerald-500
  暖: '#f59e0b', // amber-500
  高温: '#ef4444', // red-500
}

/** 温度値が属する帯を返す */
export function classifyTemperatureBand(temp: number): TemperatureBand {
  for (const band of TEMPERATURE_BANDS) {
    if (temp < band.max) return band
  }
  return TEMPERATURE_BANDS[TEMPERATURE_BANDS.length - 1]
}

/**
 * 気温軸を準固定化する。
 * データの min/max を取得し、余白を足して 5°C 刻みに丸める。
 * 0°C をまたぐ場合は 0 を含める。
 */
export function roundTemperatureAxis(
  minTemp: number,
  maxTemp: number,
): { min: number; max: number; interval: number } {
  const STEP = 5
  const PADDING = 2

  const rawMin = minTemp - PADDING
  const rawMax = maxTemp + PADDING

  const axisMin = Math.floor(rawMin / STEP) * STEP
  // Math.ceil(-3/5)*5 は -0 になるため、+0 で正規化
  const axisMax = Math.ceil(rawMax / STEP) * STEP || 0

  // 0°C をまたぐ場合は両側を含める
  const finalMin = rawMin <= 0 && rawMax >= 0 ? Math.min(axisMin, 0) : axisMin
  const finalMax = rawMin <= 0 && rawMax >= 0 ? Math.max(axisMax, 0) : axisMax

  return { min: finalMin, max: finalMax, interval: STEP }
}

/**
 * 軸レンジ内に収まる温度帯バンドを ECharts markArea 用データに変換する。
 * 軸レンジ外のバンドはクリップされる。
 */
export function buildTemperatureBandMarkAreas(
  axisMin: number,
  axisMax: number,
): readonly {
  readonly name: string
  readonly yAxis: number
  readonly itemStyle: { readonly color: string }
}[][] {
  const areas: { name: string; yAxis: number; itemStyle: { color: string } }[][] = []

  for (const band of TEMPERATURE_BANDS) {
    const clippedMin = Math.max(band.min, axisMin)
    const clippedMax = Math.min(band.max, axisMax)

    if (clippedMin >= clippedMax) continue

    areas.push([
      { name: band.label, yAxis: clippedMin, itemStyle: { color: band.color } },
      { name: '', yAxis: clippedMax, itemStyle: { color: band.color } },
    ])
  }

  return areas
}

/**
 * 当年気温線の動的色分け用 visualMap pieces を生成する。
 * ECharts の piecewise visualMap で、データ値に応じて線色を温度帯に合わせる。
 */
export function buildTemperatureVisualMapPieces(): readonly {
  readonly min: number
  readonly max: number
  readonly color: string
}[] {
  return TEMPERATURE_BANDS.map((band) => ({
    min: band.min,
    max: band.max,
    color: TEMPERATURE_LINE_COLORS[band.label] ?? palette.warningDark,
  }))
}

// ── 純粋関数 ──

/** ECharts の chartOption を構築する。React 非依存の純粋関数。 */
export function buildTimeSlotChartOption(input: TimeSlotChartOptionInput): EChartsOption {
  const {
    chartData,
    hours,
    curLabel,
    compLabel,
    showPrev,
    theme,
    lineMode,
    curWeatherMap,
    prevWeatherMap,
    coreTimeRange,
    peakHour,
    prevCoreTimeRange,
    prevPeakHour,
  } = input

  const barColor = theme.colors.palette.primary
  const qtyColor = theme.colors.palette.cyan

  // ── コアタイム / ピーク用の markArea / markPoint を事前構築 ──
  const coreTimeMarkArea = coreTimeRange
    ? {
        silent: true,
        itemStyle: {
          color: `${barColor}18`,
          borderWidth: 1,
          borderColor: `${barColor}40`,
          borderType: 'dashed' as const,
        },
        data: [
          [
            { xAxis: `${coreTimeRange.startHour}時`, name: 'コアタイム' },
            { xAxis: `${coreTimeRange.endHour}時` },
          ],
        ],
        label: {
          show: true,
          position: 'top' as const,
          fontSize: chartFontSize.axis - 1,
          color: `${barColor}cc`,
          fontWeight: 600 as const,
        },
      }
    : undefined

  const peakIdx = peakHour != null ? hours.indexOf(`${peakHour}時`) : -1
  const peakValue = peakIdx >= 0 ? ((chartData[peakIdx]?.amount as number) ?? 0) : 0
  const peakMarkPoint =
    peakHour != null && peakValue > 0
      ? {
          symbol: 'pin',
          symbolSize: 30,
          data: [{ coord: [`${peakHour}時`, peakValue], name: 'ピーク' }],
          itemStyle: { color: barColor },
          label: { show: true, fontSize: chartFontSize.axis - 2, color: '#fff', formatter: 'Peak' },
        }
      : undefined

  // ── 棒グラフ（売上金額） ──
  const series: EChartsOption['series'] = [
    {
      name: showPrev ? `${curLabel}売上` : '売上金額',
      type: 'bar',
      yAxisIndex: 0,
      data: chartData.map((r) => r.amount as number),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${barColor}d9` },
            { offset: 1, color: `${barColor}66` },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 20,
    },
  ]

  // コアタイム markArea + ピーク markPoint を当年売上バーに追加
  // ECharts union 型の制約で初期化時に含められないため、post-hoc で追加
  if (coreTimeMarkArea || peakMarkPoint) {
    const bar = (series as Record<string, unknown>[])[0]
    if (coreTimeMarkArea) bar.markArea = coreTimeMarkArea
    if (peakMarkPoint) bar.markPoint = peakMarkPoint
  }

  if (showPrev) {
    const prevBarEntry: Record<string, unknown> = {
      name: `${compLabel}売上`,
      type: 'bar',
      yAxisIndex: 0,
      data: chartData.map((r) => (r.prevAmount as number) ?? null),
      itemStyle: {
        color: `${theme.colors.palette.slate}80`,
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 20,
    }

    // 前年のコアタイム markArea（当年と色を変え、交差部分も判別可能に）
    const slateColor = theme.colors.palette.slate
    if (prevCoreTimeRange) {
      prevBarEntry.markArea = {
        silent: true,
        itemStyle: {
          color: `${slateColor}18`,
          borderWidth: 1,
          borderColor: `${slateColor}50`,
          borderType: 'dashed',
        },
        data: [
          [
            { xAxis: `${prevCoreTimeRange.startHour}時`, name: `${compLabel}コアタイム` },
            { xAxis: `${prevCoreTimeRange.endHour}時` },
          ],
        ],
        label: {
          show: true,
          position: 'bottom',
          fontSize: chartFontSize.axis - 1,
          color: `${slateColor}bb`,
          fontWeight: 500,
        },
      }
    }

    // 前年のピーク markPoint
    if (prevPeakHour != null) {
      const prevPeakIdx = hours.indexOf(`${prevPeakHour}時`)
      const prevPeakVal =
        prevPeakIdx >= 0 ? ((chartData[prevPeakIdx]?.prevAmount as number) ?? 0) : 0
      if (prevPeakVal > 0) {
        prevBarEntry.markPoint = {
          symbol: 'pin',
          symbolSize: 24,
          data: [{ coord: [`${prevPeakHour}時`, prevPeakVal], name: `${compLabel}Peak` }],
          itemStyle: { color: `${slateColor}99` },
          label: { show: true, fontSize: chartFontSize.axis - 3, color: '#fff', formatter: 'Peak' },
        }
      }
    }

    series.push(prevBarEntry as typeof series extends readonly (infer T)[] ? T : never)
  }

  // ── 折れ線（lineMode に応じて切替） ──
  const tempColor = palette.warningDark
  const precipColor = palette.infoDark
  let curTempSeriesIndex = -1

  if (lineMode === 'quantity') {
    series.push({
      name: showPrev ? `${curLabel}点数` : '点数',
      type: 'line',
      yAxisIndex: 1,
      data: chartData.map((r) => r.quantity as number),
      lineStyle: { color: qtyColor, width: 2 },
      itemStyle: { color: qtyColor },
      symbol: 'none',
      smooth: true,
    })
    if (showPrev) {
      series.push({
        name: `${compLabel}点数`,
        type: 'line',
        yAxisIndex: 1,
        data: chartData.map((r) => (r.prevQuantity as number) ?? null),
        lineStyle: { color: qtyColor, width: 1.5, type: 'dashed' },
        itemStyle: { color: qtyColor },
        symbol: 'none',
        smooth: true,
        connectNulls: true,
      })
    }
  } else if (lineMode === 'cumulative') {
    // 累積販売構成比: 各時間帯までの累積売上 / 全体売上 を %で表示
    const cumulativeColor = palette.purpleDark
    const amounts = chartData.map((r) => (r.amount as number) ?? 0)
    const totalAmount = amounts.reduce((s, v) => s + v, 0)
    if (totalAmount > 0) {
      let cumSum = 0
      const cumData = amounts.map((v) => {
        cumSum += v
        return Math.round((cumSum / totalAmount) * 10000) / 100 // 小数2位
      })
      series.push({
        name: showPrev ? `${curLabel}累積構成比` : '累積構成比',
        type: 'line',
        yAxisIndex: 1,
        data: cumData,
        lineStyle: { color: cumulativeColor, width: 2.5 },
        itemStyle: { color: cumulativeColor },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true,
        areaStyle: { color: `${cumulativeColor}15` },
      })
    }
    if (showPrev) {
      const prevAmounts = chartData.map((r) => (r.prevAmount as number) ?? 0)
      const prevTotal = prevAmounts.reduce((s, v) => s + v, 0)
      if (prevTotal > 0) {
        let prevCumSum = 0
        const prevCumData = prevAmounts.map((v) => {
          prevCumSum += v
          return Math.round((prevCumSum / prevTotal) * 10000) / 100
        })
        series.push({
          name: `${compLabel}累積構成比`,
          type: 'line',
          yAxisIndex: 1,
          data: prevCumData,
          lineStyle: { color: `${cumulativeColor}80`, width: 1.5, type: 'dashed' },
          itemStyle: { color: `${cumulativeColor}80` },
          symbol: 'none',
          smooth: true,
          connectNulls: true,
        })
      }
    }
  } else if (lineMode === 'temperature') {
    // 当年気温シリーズ: 色は visualMap で温度帯ごとに動的に適用
    curTempSeriesIndex = series.length
    series.push({
      name: showPrev ? `${curLabel}気温` : '気温',
      type: 'line',
      yAxisIndex: 1,
      data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.temp ?? null),
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
    })
    if (showPrev && prevWeatherMap.size > 0) {
      series.push({
        name: `${compLabel}気温`,
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.temp ?? null),
        lineStyle: { color: `${tempColor}99`, width: 1.5, type: 'dashed' },
        itemStyle: { color: `${tempColor}99` },
        symbol: 'circle',
        symbolSize: 3,
        smooth: true,
        connectNulls: true,
      })
    }
  } else {
    // precipitation
    series.push({
      name: showPrev ? `${curLabel}降水量` : '降水量',
      type: 'line',
      yAxisIndex: 1,
      data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.precip ?? null),
      lineStyle: { color: precipColor, width: 2 },
      itemStyle: { color: precipColor },
      areaStyle: { color: `${precipColor}20` },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
    })
    if (showPrev && prevWeatherMap.size > 0) {
      series.push({
        name: `${compLabel}降水量`,
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.precip ?? null),
        lineStyle: { color: precipColor, width: 1.5, type: 'dashed' },
        itemStyle: { color: precipColor },
        symbol: 'circle',
        symbolSize: 3,
        smooth: true,
        connectNulls: true,
      })
    }
  }

  // ── 右Y軸の構築 ──
  const rightYAxisFormatter =
    lineMode === 'quantity'
      ? (v: number) => toComma(v)
      : lineMode === 'cumulative'
        ? (v: number) => `${v}%`
        : lineMode === 'temperature'
          ? (v: number) => `${v}°`
          : (v: number) => `${v}mm`

  // 降水量モード: 固定スケールで小さい値の誇張を防ぐ
  const rightAxisOptions: Parameters<typeof valueYAxis>[1] = {
    formatter: rightYAxisFormatter,
    position: 'right' as const,
    showSplitLine: false,
  }

  // 天気データの min/max を収集（気温・降水量の軸レンジ決定に使用）
  let minTemp = Infinity
  let maxTemp = -Infinity
  let maxPrecip = 0

  if (lineMode === 'temperature' || lineMode === 'precipitation') {
    for (const h of hours) {
      const hourNum = parseInt(h, 10)
      const curEntry = curWeatherMap.get(hourNum)
      const prevEntry = prevWeatherMap.get(hourNum)

      if (lineMode === 'temperature') {
        if (curEntry != null) {
          minTemp = Math.min(minTemp, curEntry.temp)
          maxTemp = Math.max(maxTemp, curEntry.temp)
        }
        if (prevEntry != null) {
          minTemp = Math.min(minTemp, prevEntry.temp)
          maxTemp = Math.max(maxTemp, prevEntry.temp)
        }
      } else {
        maxPrecip = Math.max(maxPrecip, curEntry?.precip ?? 0, prevEntry?.precip ?? 0)
      }
    }
  }

  if (lineMode === 'cumulative') {
    rightAxisOptions.min = 0
    rightAxisOptions.max = 100
    rightAxisOptions.interval = 20
  }

  if (lineMode === 'precipitation') {
    const precipRange = resolvePrecipitationAxisRange(maxPrecip)
    rightAxisOptions.min = precipRange.min
    rightAxisOptions.max = precipRange.max
    rightAxisOptions.interval = precipRange.interval
  }

  if (lineMode === 'temperature' && isFinite(minTemp) && isFinite(maxTemp)) {
    const tempRange = roundTemperatureAxis(minTemp, maxTemp)
    rightAxisOptions.min = tempRange.min
    rightAxisOptions.max = tempRange.max
    rightAxisOptions.interval = tempRange.interval
  }

  // 気温モード: visualMap で当年気温線を温度帯ごとに色分け
  let visualMap: EChartsOption['visualMap'] = undefined
  if (
    lineMode === 'temperature' &&
    isFinite(minTemp) &&
    isFinite(maxTemp) &&
    curTempSeriesIndex >= 0
  ) {
    const pieces = buildTemperatureVisualMapPieces()
    visualMap = {
      show: false,
      type: 'piecewise',
      dimension: 1, // y値（気温）で色分け
      seriesIndex: curTempSeriesIndex,
      pieces: pieces.map((p) => ({
        gte: p.min,
        lt: p.max,
        color: p.color,
      })),
    }
  }

  // 気温モード: 温度帯バンドを markArea で追加
  if (lineMode === 'temperature' && isFinite(minTemp) && isFinite(maxTemp)) {
    const tempRange = roundTemperatureAxis(minTemp, maxTemp)
    const bandAreas = buildTemperatureBandMarkAreas(tempRange.min, tempRange.max)

    if (bandAreas.length > 0) {
      // 温度帯バンドを透明な補助シリーズとして追加
      series.push({
        name: '温度帯',
        type: 'line',
        yAxisIndex: 1,
        data: [],
        markArea: {
          silent: true,
          data: bandAreas.map(([start, end]) => [
            { yAxis: start.yAxis, itemStyle: start.itemStyle },
            { yAxis: end.yAxis, itemStyle: end.itemStyle },
          ]),
        },
        legendHoverLink: false,
      } as unknown as typeof series extends readonly (infer T)[] ? T : never)
    }
  }

  return {
    grid: { left: GRID_LEFT, right: GRID_RIGHT, top: 10, bottom: 40, containLabel: false },
    tooltip: buildTimeSlotTooltip(theme, showPrev, curLabel, compLabel, lineMode),
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: [...hours],
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
    yAxis: [yenYAxis(theme), valueYAxis(theme, rightAxisOptions)],
    series,
    ...(visualMap != null ? { visualMap } : {}),
  }
}

/** 天気データ配列を hour→{temp, precip} Map に変換する純粋関数 */
export function buildWeatherMap(
  weatherAvg:
    | readonly { hour: number; avgTemperature: number; totalPrecipitation: number }[]
    | null,
): Map<number, WeatherMapEntry> {
  const m = new Map<number, WeatherMapEntry>()
  if (weatherAvg) {
    for (const w of weatherAvg) {
      m.set(w.hour, { temp: w.avgTemperature, precip: w.totalPrecipitation })
    }
  }
  return m
}
