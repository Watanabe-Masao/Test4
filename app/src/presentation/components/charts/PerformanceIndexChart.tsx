import { useCallback, useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { useChartTheme, toComma, toPct, toDevScore } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import type { DailyRecord } from '@/domain/models'
import {
  safeDivide,
  calculateTransactionValue,
  calculateMovingAverage,
  calculateShare,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  Wrapper,
  HeaderRow,
  Title,
  ViewToggle,
  ViewBtn,
  StatsRow,
  StatChip,
  AnomalyNote,
} from './PerformanceIndexChart.styles'

type ViewType = 'pi' | 'deviation' | 'zScore'

const VIEW_LABELS: Record<ViewType, string> = {
  pi: 'PI値',
  deviation: '偏差値',
  zScore: 'Zスコア',
}

const PERF_LABELS: Record<string, string> = {
  pi: '金額PI値',
  prevPi: '前年PI値',
  piMa7: 'PI値(7日MA)',
  prevPiMa7: '前年PI値(7日MA)',
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

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
  /** 日クリック時コールバック（異常値バーのクリックでナビゲーション） */
  onDayClick?: (day: number) => void
}

export const PerformanceIndexChart = memo(function PerformanceIndexChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  onDayClick,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('pi')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  const { chartData, stats, piMa7, prevPiMa7 } = useMemo(() => {
    // Phase 1: Collect raw values
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

      // PI値 = 売上 / 客数 × 1000
      const pi = customers > 0 ? safeDivide(sales, customers, 0) * 1000 : null

      const prev = prevYearDaily?.get(toDateKeyFromParts(year, month, d))
      const prevCustomers = prev?.customers ?? 0
      const prevPi =
        prevCustomers > 0 ? safeDivide(prev?.sales ?? 0, prevCustomers, 0) * 1000 : null

      if (sales > 0) salesValues.push(sales)
      if (customers > 0) customerValues.push(customers)
      if (txValue != null) txValues.push(txValue)
      if (grossSales > 0) discountRates.push(discountRate)
      if (sales > 0) gpRates.push(gpRate)

      piRaw.push(pi ?? 0)
      prevPiRaw.push(prevPi ?? 0)

      rawRows.push({ day: d, sales, customers, txValue, discountRate, gpRate, pi, prevPi })
    }

    // Phase 2: Compute stats for deviation/z-score
    const salesStat = calculateStdDev(salesValues)
    const custStat = calculateStdDev(customerValues)
    const txStat = calculateStdDev(txValues)
    const discStat = calculateStdDev(discountRates)
    const gpStat = calculateStdDev(gpRates)

    // Phase 3: Build chart rows with z-scores and deviation scores
    const rows = rawRows.map((r) => {
      const salesZ =
        salesStat.stdDev > 0 && r.sales > 0 ? (r.sales - salesStat.mean) / salesStat.stdDev : null
      const custZ =
        custStat.stdDev > 0 && r.customers > 0
          ? (r.customers - custStat.mean) / custStat.stdDev
          : null
      const txZ =
        txStat.stdDev > 0 && r.txValue != null ? (r.txValue - txStat.mean) / txStat.stdDev : null
      const discZ =
        discStat.stdDev > 0 && r.sales > 0
          ? (r.discountRate - discStat.mean) / discStat.stdDev
          : null
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

    // Moving averages for PI values
    const piMa = calculateMovingAverage(piRaw, 7).map((v) => (isNaN(v) ? null : v))
    const prevPiMa = calculateMovingAverage(prevPiRaw, 7).map((v) => (isNaN(v) ? null : v))

    return {
      chartData: rows,
      stats: { sales: salesStat, cust: custStat, tx: txStat, disc: discStat, gp: gpStat },
      piMa7: piMa,
      prevPiMa7: prevPiMa,
    }
  }, [daily, daysInMonth, year, month, prevYearDaily])

  const data = chartData
    .map((d, i) => ({
      ...d,
      piMa7: piMa7[i],
      prevPiMa7: prevPiMa7[i],
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  const hasAnomalies = useMemo(
    () => data.some((d) => d.salesZ != null && Math.abs(d.salesZ) >= 2),
    [data],
  )

  const titleMap: Record<ViewType, string> = {
    pi: 'PI値分析（金額PI = 売上/客数×1000 / 7日移動平均）',
    deviation: '偏差値分析（各指標の日別偏差値 / 基準=50）',
    zScore: 'Zスコア分析（平均=0からの乖離度 / |Z|≥2 で異常値）',
  }

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick || view !== 'zScore') return
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const entry = data[dataIndex]
      if (entry && entry.salesZ != null && Math.abs(entry.salesZ) >= 2) {
        onDayClick(entry.day)
      }
    },
    [onDayClick, view, data],
  )

  const option = useMemo<EChartsOption>(() => {
    const days = data.map((d) => String(d.day))
    const series: EChartsOption['series'] = []

    const tooltipFormatter = (params: unknown): string => {
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

    if (view === 'pi') {
      // Per-bar coloring: build an array of colors
      const barColors = data.map((entry) =>
        entry.prevPi != null && entry.pi != null && entry.pi >= entry.prevPi
          ? ct.colors.primary
          : ct.colors.slateDark,
      )

      series.push({
        name: 'pi',
        type: 'bar' as const,
        data: (data as unknown as Record<string, unknown>[]).map((d, i) => ({
          value: d.pi as number | null,
          itemStyle: { color: barColors[i] },
        })),
        barMaxWidth: 14,
        itemStyle: { borderRadius: [2, 2, 0, 0], opacity: 0.7 },
      })
      series.push({
        name: 'piMa7',
        type: 'line' as const,
        data: data.map((d) => d.piMa7 ?? null),
        lineStyle: { color: ct.colors.primary, width: 2.5 },
        itemStyle: { color: ct.colors.primary },
        symbol: 'none' as const,
        connectNulls: true,
      })
      series.push({
        name: 'prevPiMa7',
        type: 'line' as const,
        data: data.map((d) => d.prevPiMa7 ?? null),
        lineStyle: { color: ct.colors.slate, width: 1.5, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        symbol: 'none' as const,
        connectNulls: true,
      })

      return {
        grid: standardGrid(),
        tooltip: {
          ...standardTooltip(theme),
          formatter: tooltipFormatter,
        },
        legend: {
          ...standardLegend(theme),
          formatter: (name: string) => PERF_LABELS[name] ?? name,
        },
        xAxis: {
          type: 'category' as const,
          data: days,
          axisLabel: { color: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily },
          axisLine: { lineStyle: { color: ct.grid } },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value' as const,
          axisLabel: {
            formatter: (v: number) => toComma(v),
            color: ct.textMuted,
            fontSize: ct.fontSize.xs,
            fontFamily: ct.monoFamily,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
        },
        series,
      }
    }

    if (view === 'deviation') {
      const lineConfigs = [
        { key: 'salesDev', color: ct.colors.primary, width: 2 },
        { key: 'custDev', color: ct.colors.info, width: 2 },
        { key: 'txDev', color: ct.colors.purple, width: 2, dash: 'dashed' as const },
        { key: 'gpDev', color: ct.colors.success, width: 1.5 },
        { key: 'discDev', color: ct.colors.danger, width: 1.5, dash: 'dashed' as const },
      ]

      for (const cfg of lineConfigs) {
        series.push({
          name: cfg.key,
          type: 'line' as const,
          data: (data as unknown as Record<string, unknown>[]).map(
            (d) => (d[cfg.key] as number | null) ?? null,
          ),
          lineStyle: {
            color: cfg.color,
            width: cfg.width,
            ...(cfg.dash ? { type: cfg.dash } : {}),
          },
          itemStyle: { color: cfg.color },
          symbol: 'none' as const,
          connectNulls: true,
        })
      }

      return {
        grid: standardGrid(),
        tooltip: {
          ...standardTooltip(theme),
          formatter: tooltipFormatter,
        },
        legend: {
          ...standardLegend(theme),
          formatter: (name: string) => PERF_LABELS[name] ?? name,
        },
        xAxis: {
          type: 'category' as const,
          data: days,
          axisLabel: { color: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily },
          axisLine: { lineStyle: { color: ct.grid } },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value' as const,
          min: 20,
          max: 80,
          axisLabel: {
            color: ct.textMuted,
            fontSize: ct.fontSize.xs,
            fontFamily: ct.monoFamily,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
        },
        series: [
          ...series,
          // Reference lines as markLines on the first series
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

    // zScore view
    const barColors = data.map((entry) => {
      const z = entry.salesZ ?? 0
      const isAnomaly = Math.abs(z) >= 2
      return isAnomaly ? ct.colors.danger : z >= 0 ? ct.colors.primary : ct.colors.slateDark
    })
    const barOpacities = data.map((entry) => {
      const z = entry.salesZ ?? 0
      return Math.abs(z) >= 2 ? 0.9 : 0.5
    })

    series.push({
      name: 'salesZ',
      type: 'bar' as const,
      data: (data as unknown as Record<string, unknown>[]).map((d, i) => ({
        value: d.salesZ as number | null,
        itemStyle: { color: barColors[i], opacity: barOpacities[i] },
      })),
      barMaxWidth: 10,
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    })
    series.push({
      name: 'custZ',
      type: 'line' as const,
      data: data.map((d) => d.custZ ?? null),
      lineStyle: { color: ct.colors.info, width: 1.5 },
      itemStyle: { color: ct.colors.info },
      symbol: 'none' as const,
      connectNulls: true,
    })
    series.push({
      name: 'txZ',
      type: 'line' as const,
      data: data.map((d) => d.txZ ?? null),
      lineStyle: { color: ct.colors.purple, width: 1.5, type: 'dashed' as const },
      itemStyle: { color: ct.colors.purple },
      symbol: 'none' as const,
      connectNulls: true,
    })

    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: tooltipFormatter,
      },
      legend: {
        ...standardLegend(theme),
        formatter: (name: string) => PERF_LABELS[name] ?? name,
      },
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: { color: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily },
        axisLine: { lineStyle: { color: ct.grid } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          color: ct.textMuted,
          fontSize: ct.fontSize.xs,
          fontFamily: ct.monoFamily,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
      },
      series: [
        ...series,
        // Reference lines
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
  }, [data, view, ct, theme])

  return (
    <Wrapper aria-label="業績指数チャート">
      <HeaderRow>
        <Title>
          {titleMap[view]}
          <ChartHelpButton guide={CHART_GUIDES['performance-index']} />
        </Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      </HeaderRow>

      {view === 'deviation' && (
        <StatsRow>
          <StatChip $color={ct.colors.primary}>
            売上 平均:{toComma(stats.sales.mean)} σ:{toComma(stats.sales.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.info}>
            客数 平均:{toComma(stats.cust.mean)} σ:{toComma(stats.cust.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.purple}>
            客単価 平均:{toComma(stats.tx.mean)} σ:{toComma(stats.tx.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.danger}>
            売変率 平均:{toPct(stats.disc.mean)} σ:{toPct(stats.disc.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.success}>
            粗利率 平均:{toPct(stats.gp.mean)} σ:{toPct(stats.gp.stdDev)}
          </StatChip>
        </StatsRow>
      )}

      <EChart
        option={option}
        height={view === 'deviation' ? 280 : 320}
        onClick={view === 'zScore' && onDayClick ? handleClick : undefined}
        ariaLabel="業績指数チャート"
      />

      <DualPeriodSlider
        min={1}
        max={daysInMonth}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
      {view === 'zScore' && hasAnomalies && onDayClick && (
        <AnomalyNote>異常値をクリックすると詳細を表示</AnomalyNote>
      )}
    </Wrapper>
  )
})
