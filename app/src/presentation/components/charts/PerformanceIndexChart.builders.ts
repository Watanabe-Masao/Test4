/**
 * PerformanceIndexChart — データ構築 + ECharts オプションビルダー
 *
 * 純粋関数のみ。コンポーネント本体から分離（C1: 1ファイル = 1変更理由）。
 */
import type { EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { toComma, toDevScore, type ChartTheme } from './chartTheme'
import type { AppTheme } from '@/presentation/theme/theme'
import type { DailyRecord } from '@/domain/models/record'
import {
  safeDivide,
  calculateTransactionValue,
  calculateShare,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { calculateAmountPI } from '@/domain/calculations/piValue'

// ── 型定義 ──

export interface PerformanceRow {
  day: number
  sales: number
  customers: number
  txValue: number | null
  discountRate: number
  gpRate: number
  pi: number | null
  prevPi: number | null
  salesZ: number | null
  custZ: number | null
  txZ: number | null
  discZ: number | null
  gpZ: number
  salesDev: number | null
  custDev: number | null
  txDev: number | null
  discDev: number | null
  gpDev: number | null
}

interface StatEntry {
  mean: number
  stdDev: number
}

export interface PerformanceStats {
  sales: StatEntry
  cust: StatEntry
  tx: StatEntry
  disc: StatEntry
  gp: StatEntry
}

/** partial MA: ウィンドウ不足でも利用可能な分で計算（月初からMA表示） */
function calculatePartialMovingAverage(
  values: readonly number[],
  window: number,
): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    const valid = slice.filter((v) => v > 0)
    if (valid.length === 0) return null
    return valid.reduce((s, v) => s + v, 0) / valid.length
  })
}

export type ViewType = 'piAmount' | 'piQuantity' | 'deviation' | 'zScore'

export const PERF_LABELS: Record<string, string> = {
  pi: '金額PI値',
  prevPi: '前年PI値',
  piMa7: 'PI値(7日MA)',
  prevPiMa7: '前年PI値(7日MA)',
  quantityPi: '点数PI値',
  quantityPiMa7: '点数PI値(7日MA)',
  salesDev: '売上',
  custDev: '客数',
  txDev: '客単価',
  discDev: '売変率',
  gpDev: '粗利率',
  salesZ: '売上',
  custZ: '客数',
  txZ: '客単価',
  discZ: '売変率',
  gpZ: '粗利率',
}

// ── データ構築 ──

export function buildPerformanceData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>,
): {
  chartData: PerformanceRow[]
  stats: PerformanceStats
  piMa7: (number | null)[]
  prevPiMa7: (number | null)[]
} {
  const salesValues: number[] = []
  const customerValues: number[] = []
  const txValues: number[] = []
  const discountRates: number[] = []
  const gpRates: number[] = []
  const piRaw: number[] = []
  const prevPiRaw: number[] = []

  const rawRows: {
    day: number
    sales: number
    customers: number
    txValue: number | null
    discountRate: number
    gpRate: number
    pi: number | null
    prevPi: number | null
  }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const sales = rec?.sales ?? 0
    const grossSales = rec?.grossSales ?? 0
    const customers = rec?.customers ?? 0
    const discount = rec?.discountAbsolute ?? 0
    const cost = rec ? rec.totalCost : 0
    const costInclusion = rec?.costInclusion.cost ?? 0
    const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
    const discountRate = grossSales > 0 ? calculateShare(discount, grossSales) : 0
    const gpRate = sales > 0 ? calculateGrossProfitRate(sales - cost - costInclusion, sales) : 0
    const pi = customers > 0 ? calculateAmountPI(sales, customers) : null

    const prev = prevYearDaily.get(toDateKeyFromParts(year, month, d))
    const prevCustomers = prev?.customers ?? 0
    const prevPi = prevCustomers > 0 ? safeDivide(prev?.sales ?? 0, prevCustomers, 0) * 1000 : null

    if (sales > 0) salesValues.push(sales)
    if (customers > 0) customerValues.push(customers)
    if (txValue != null) txValues.push(txValue)
    if (grossSales > 0) discountRates.push(discountRate)
    if (sales > 0) gpRates.push(gpRate)
    piRaw.push(pi ?? 0)
    prevPiRaw.push(prevPi ?? 0)
    rawRows.push({ day: d, sales, customers, txValue, discountRate, gpRate, pi, prevPi })
  }

  const salesStat = calculateStdDev(salesValues)
  const custStat = calculateStdDev(customerValues)
  const txStat = calculateStdDev(txValues)
  const discStat = calculateStdDev(discountRates)
  const gpStat = calculateStdDev(gpRates)

  const rows: PerformanceRow[] = rawRows.map((r) => {
    const salesZ =
      salesStat.stdDev > 0 && r.sales > 0 ? (r.sales - salesStat.mean) / salesStat.stdDev : null
    const custZ =
      custStat.stdDev > 0 && r.customers > 0
        ? (r.customers - custStat.mean) / custStat.stdDev
        : null
    const txZ =
      txStat.stdDev > 0 && r.txValue != null ? (r.txValue - txStat.mean) / txStat.stdDev : null
    const discZ =
      discStat.stdDev > 0 && r.sales > 0 ? (r.discountRate - discStat.mean) / discStat.stdDev : null
    const gpZ = gpStat.stdDev > 0 && r.sales > 0 ? (r.gpRate - gpStat.mean) / gpStat.stdDev : 0
    return {
      ...r,
      salesZ,
      custZ,
      txZ,
      discZ,
      gpZ,
      salesDev: salesZ != null ? toDevScore(salesZ) : null,
      custDev: custZ != null ? toDevScore(custZ) : null,
      txDev: txZ != null ? toDevScore(txZ) : null,
      discDev: discZ != null ? toDevScore(discZ) : null,
      gpDev: gpZ != null ? toDevScore(gpZ) : null,
    }
  })

  return {
    chartData: rows,
    stats: { sales: salesStat, cust: custStat, tx: txStat, disc: discStat, gp: gpStat },
    piMa7: calculatePartialMovingAverage(piRaw, 7),
    prevPiMa7: calculatePartialMovingAverage(prevPiRaw, 7),
  }
}

// ── ECharts オプション構築 ──

export interface PerformanceDataRow extends PerformanceRow {
  piMa7: number | null
  prevPiMa7: number | null
}

function commonXAxis(days: string[], ct: ChartTheme): EChartsOption['xAxis'] {
  return {
    type: 'category' as const,
    data: days,
    axisLabel: { color: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily },
    axisLine: { lineStyle: { color: ct.grid } },
    axisTick: { show: false },
  }
}

function perfTooltipFormatter(params: unknown): string {
  const items = params as { seriesName: string; value: number | null; color: string }[]
  if (!Array.isArray(items) || items.length === 0) return ''
  const first = items[0] as { axisValue?: string }
  let html = `<div style="font-size:11px"><strong>${first.axisValue ?? ''}日</strong>`
  for (const item of items) {
    const name = PERF_LABELS[item.seriesName] ?? item.seriesName
    let formatted: string
    if (item.value == null) {
      formatted = '-'
    } else if (
      item.seriesName.includes('pi') ||
      item.seriesName.includes('Pi') ||
      item.seriesName.includes('Ma7') ||
      item.seriesName.includes('prevPi')
    ) {
      formatted = toComma(item.value)
    } else if (item.seriesName.includes('Dev') || item.seriesName.includes('dev')) {
      formatted = item.value.toFixed(1)
    } else if (item.seriesName.includes('Z') || item.seriesName.includes('z')) {
      formatted = item.value.toFixed(2)
    } else {
      formatted = toComma(item.value)
    }
    html += `<br/><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px"></span>${name}: ${formatted}`
  }
  html += '</div>'
  return html
}

export function buildPerformanceOption(
  data: readonly PerformanceDataRow[],
  view: ViewType,
  ct: ChartTheme,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const series: EChartsOption['series'] = []
  const base = {
    grid: standardGrid(),
    tooltip: { ...standardTooltip(theme), formatter: perfTooltipFormatter },
    legend: { ...standardLegend(theme), formatter: (name: string) => PERF_LABELS[name] ?? name },
    xAxis: commonXAxis(days, ct),
  }

  if (view === 'piAmount' || view === 'piQuantity') {
    const hasPrev = data.some((e) => e.prevPi != null)
    // 前年PI棒（当年棒の背後にグレー棒で表示）
    if (hasPrev) {
      series.push({
        name: 'prevPi',
        type: 'bar' as const,
        data: (data as unknown as Record<string, unknown>[]).map((d) => ({
          value: d.prevPi as number | null,
        })),
        barMaxWidth: 18,
        barGap: '-100%',
        z: 1,
        itemStyle: { color: ct.colors.slate, borderRadius: [3, 3, 0, 0], opacity: 0.35 },
      })
    }
    // 当年PI棒（前年比で色分け：上回り=primary、下回り=orange）
    const barColors = data.map((e) =>
      e.prevPi != null && e.pi != null && e.pi >= e.prevPi ? ct.colors.primary : ct.colors.orange,
    )
    series.push(
      {
        name: 'pi',
        type: 'bar' as const,
        data: (data as unknown as Record<string, unknown>[]).map((d, i) => ({
          value: d.pi as number | null,
          itemStyle: { color: barColors[i] },
        })),
        barMaxWidth: 18,
        z: 2,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
      {
        name: 'piMa7',
        type: 'line' as const,
        data: data.map((d) => d.piMa7 ?? null),
        lineStyle: { color: ct.colors.primary, width: 2.5 },
        itemStyle: { color: ct.colors.primary },
        symbol: 'none' as const,
        connectNulls: true,
        smooth: true,
      },
      {
        name: 'prevPiMa7',
        type: 'line' as const,
        data: data.map((d) => d.prevPiMa7 ?? null),
        lineStyle: { color: ct.colors.slate, width: 1.5, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        symbol: 'none' as const,
        connectNulls: true,
        smooth: true,
      },
    )
    return { ...base, yAxis: valueYAxis(theme, { formatter: (v: number) => toComma(v) }), series }
  }

  if (view === 'deviation') {
    for (const cfg of [
      { key: 'salesDev', color: ct.colors.primary, width: 2 },
      { key: 'custDev', color: ct.colors.info, width: 2 },
      { key: 'txDev', color: ct.colors.purple, width: 2, dash: 'dashed' as const },
      { key: 'gpDev', color: ct.colors.success, width: 1.5 },
      { key: 'discDev', color: ct.colors.danger, width: 1.5, dash: 'dashed' as const },
    ]) {
      series.push({
        name: cfg.key,
        type: 'line' as const,
        data: (data as unknown as Record<string, unknown>[]).map(
          (d) => (d[cfg.key] as number | null) ?? null,
        ),
        lineStyle: { color: cfg.color, width: cfg.width, ...(cfg.dash ? { type: cfg.dash } : {}) },
        itemStyle: { color: cfg.color },
        symbol: 'none' as const,
        connectNulls: true,
      })
    }
    return {
      ...base,
      yAxis: valueYAxis(theme, { min: 20, max: 80 }),
      series: [
        ...series,
        {
          name: '__ref__',
          type: 'line' as const,
          data: [],
          symbol: 'none' as const,
          markLine: {
            silent: true,
            symbol: 'none' as const,
            label: { show: false },
            data: [
              {
                yAxis: 50,
                lineStyle: { color: ct.grid, width: 1.5, opacity: 0.7, type: 'solid' as const },
              },
              {
                yAxis: 60,
                lineStyle: {
                  color: ct.colors.success,
                  width: 1,
                  opacity: 0.3,
                  type: 'dashed' as const,
                },
              },
              {
                yAxis: 40,
                lineStyle: {
                  color: ct.colors.danger,
                  width: 1,
                  opacity: 0.3,
                  type: 'dashed' as const,
                },
              },
            ],
          },
        },
      ],
    }
  }

  // zScore
  const barColors = data.map((e) => {
    const z = e.salesZ ?? 0
    return Math.abs(z) >= 2 ? ct.colors.danger : z >= 0 ? ct.colors.primary : ct.colors.slateDark
  })
  const barOpacities = data.map((e) => {
    const z = e.salesZ ?? 0
    return Math.abs(z) >= 2 ? 0.9 : 0.5
  })
  series.push(
    {
      name: 'salesZ',
      type: 'bar' as const,
      data: (data as unknown as Record<string, unknown>[]).map((d, i) => ({
        value: d.salesZ as number | null,
        itemStyle: { color: barColors[i], opacity: barOpacities[i] },
      })),
      barMaxWidth: 10,
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
    {
      name: 'custZ',
      type: 'line' as const,
      data: data.map((d) => d.custZ ?? null),
      lineStyle: { color: ct.colors.info, width: 1.5 },
      itemStyle: { color: ct.colors.info },
      symbol: 'none' as const,
      connectNulls: true,
    },
    {
      name: 'txZ',
      type: 'line' as const,
      data: data.map((d) => d.txZ ?? null),
      lineStyle: { color: ct.colors.purple, width: 1.5, type: 'dashed' as const },
      itemStyle: { color: ct.colors.purple },
      symbol: 'none' as const,
      connectNulls: true,
    },
  )
  return {
    ...base,
    yAxis: valueYAxis(theme),
    series: [
      ...series,
      {
        name: '__ref__',
        type: 'line' as const,
        data: [],
        symbol: 'none' as const,
        markLine: {
          silent: true,
          symbol: 'none' as const,
          label: { show: false },
          data: [
            {
              yAxis: 0,
              lineStyle: { color: ct.grid, width: 1.5, opacity: 0.7, type: 'solid' as const },
            },
            {
              yAxis: 2,
              lineStyle: {
                color: ct.colors.danger,
                width: 1,
                opacity: 0.4,
                type: 'dashed' as const,
              },
              label: {
                show: true,
                formatter: '+2\u03c3',
                color: ct.colors.danger,
                fontSize: 8,
                position: 'end' as const,
              },
            },
            {
              yAxis: -2,
              lineStyle: {
                color: ct.colors.danger,
                width: 1,
                opacity: 0.4,
                type: 'dashed' as const,
              },
              label: {
                show: true,
                formatter: '-2\u03c3',
                color: ct.colors.danger,
                fontSize: 8,
                position: 'end' as const,
              },
            },
          ],
        },
      },
    ],
  }
}
