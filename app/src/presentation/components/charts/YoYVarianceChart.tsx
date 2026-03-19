import { memo, useState, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart } from './EChart'
import type { EChartsOption } from 'echarts'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { useChartTheme, toComma, toPct, toAxisYen } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import {
  Wrapper,
  HeaderRow,
  Title,
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
} from './YoYVarianceChart.styles'
import type { DailyRecord } from '@/domain/models'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  calculateTransactionValue,
  calculateMovingAverage,
  calculateGrowthRate,
} from '@/domain/calculations/utils'

type ViewType = 'salesGap' | 'multiGap' | 'growthRate'
type GrowthSubMode = 'daily' | 'cumulative' | 'ma7'

const VIEW_LABELS: Record<ViewType, string> = {
  salesGap: '売上差異',
  multiGap: '複合差異',
  growthRate: '成長率',
}

const GROWTH_SUB_LABELS: Record<GrowthSubMode, string> = {
  daily: '日別',
  cumulative: '累計',
  ma7: '7日移動平均',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
}

/** NaN → null */
function maToNull(values: number[]): (number | null)[] {
  return values.map((v) => (isNaN(v) ? null : v))
}

const allLabels: Record<string, string> = {
  salesDiff: '売上差異',
  discountDiff: '売変差異',
  customerDiff: '客数差異',
  cumSalesDiff: '累計売上差異',
  cumDiscountDiff: '累計売変差異',
  cumCustomerDiff: '累計客数差異',
  salesGrowth: '売上成長率',
  customerGrowth: '客数成長率',
  txValueGrowth: '客単価成長率',
  cumSalesGrowth: '売上成長率(累計)',
  cumCustomerGrowth: '客数成長率(累計)',
  cumTxValueGrowth: '客単価成長率(累計)',
  salesGrowthMa7: '売上成長率(7日MA)',
  customerGrowthMa7: '客数成長率(7日MA)',
  txValueGrowthMa7: '客単価成長率(7日MA)',
}

/** ECharts tooltip formatter for all views */
function buildTooltipFormatter(view: ViewType): (params: unknown) => string {
  return (params: unknown) => {
    const items = params as { seriesName: string; value: unknown; marker: string }[]
    if (!Array.isArray(items) || items.length === 0) return ''
    const first = items[0]
    const dayVal = (first as unknown as { axisValue: string }).axisValue
    let html = `<div style="font-weight:600;margin-bottom:4px">${dayVal}日</div>`
    for (const item of items) {
      const val = item.value as number | null | undefined
      const name = item.seriesName
      let formatted: string
      if (val == null) {
        formatted = '-'
      } else if (view === 'growthRate') {
        formatted = toPct(val)
      } else {
        const key = name
        if (
          key.includes('customer') ||
          key.includes('Customer') ||
          key === allLabels.customerDiff
        ) {
          formatted = `${val >= 0 ? '+' : ''}${toComma(val)}人`
        } else {
          formatted = `${val >= 0 ? '+' : ''}${toComma(val)}`
        }
      }
      html += `<div>${item.marker} ${name}: <strong>${formatted}</strong></div>`
    }
    return html
  }
}

/** Build ECharts option for salesGap view */
function buildSalesGapOption(
  data: Record<string, unknown>[],
  ct: ReturnType<typeof useChartTheme>,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesDiffData = data.map((d) => d.salesDiff as number)
  const cumSalesDiffData = data.map((d) => d.cumSalesDiff as number)
  const barColors = data.map((d) =>
    (d.salesDiff as number) >= 0 ? ct.colors.success : ct.colors.danger,
  )

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('salesGap'),
    },
    legend: {
      ...standardLegend(theme),
      data: [allLabels.salesDiff, allLabels.cumSalesDiff],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.xs,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => toAxisYen(v),
          color: ct.textMuted,
          fontSize: ct.fontSize.xs,
          fontFamily: ct.monoFamily,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
      },
      {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => toAxisYen(v),
          color: ct.textMuted,
          fontSize: ct.fontSize.xs,
          fontFamily: ct.monoFamily,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: allLabels.salesDiff,
        type: 'bar' as const,
        yAxisIndex: 0,
        data: salesDiffData.map((v, i) => ({
          value: v,
          itemStyle: { color: barColors[i], opacity: 0.7 },
        })),
        barMaxWidth: 16,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels.cumSalesDiff,
        type: 'line' as const,
        yAxisIndex: 1,
        data: cumSalesDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.colors.primary },
        itemStyle: { color: ct.colors.primary },
      },
    ],
  }
}

/** Build ECharts option for multiGap view */
function buildMultiGapOption(
  data: Record<string, unknown>[],
  ct: ReturnType<typeof useChartTheme>,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesDiffData = data.map((d) => d.salesDiff as number)
  const discountDiffData = data.map((d) => d.discountDiff as number)
  const customerDiffData = data.map((d) => d.customerDiff as number)
  const barColors = data.map((d) =>
    (d.salesDiff as number) >= 0 ? ct.colors.primary : ct.colors.slateDark,
  )

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('multiGap'),
    },
    legend: {
      ...standardLegend(theme),
      data: [allLabels.salesDiff, allLabels.discountDiff, allLabels.customerDiff],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.xs,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => toAxisYen(v),
          color: ct.textMuted,
          fontSize: ct.fontSize.xs,
          fontFamily: ct.monoFamily,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
      },
      {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => `${toComma(v)}人`,
          color: ct.textMuted,
          fontSize: ct.fontSize.xs,
          fontFamily: ct.monoFamily,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: allLabels.salesDiff,
        type: 'bar' as const,
        yAxisIndex: 0,
        data: salesDiffData.map((v, i) => ({
          value: v,
          itemStyle: { color: barColors[i], opacity: 0.7 },
        })),
        barMaxWidth: 12,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels.discountDiff,
        type: 'line' as const,
        yAxisIndex: 0,
        data: discountDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.colors.danger },
        itemStyle: { color: ct.colors.danger },
      },
      {
        name: allLabels.customerDiff,
        type: 'line' as const,
        yAxisIndex: 1,
        data: customerDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.colors.info, type: 'dashed' as const },
        itemStyle: { color: ct.colors.info },
      },
    ],
  }
}

/** Build ECharts option for growthRate view */
function buildGrowthRateOption(
  data: Record<string, unknown>[],
  growthKeys: { sales: string; customer: string; txValue: string },
  ct: ReturnType<typeof useChartTheme>,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesData = data.map((d) => (d[growthKeys.sales] as number | null) ?? null)
  const customerData = data.map((d) => (d[growthKeys.customer] as number | null) ?? null)
  const txValueData = data.map((d) => (d[growthKeys.txValue] as number | null) ?? null)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('growthRate'),
    },
    legend: {
      ...standardLegend(theme),
      data: [
        allLabels[growthKeys.sales] ?? growthKeys.sales,
        allLabels[growthKeys.customer] ?? growthKeys.customer,
        allLabels[growthKeys.txValue] ?? growthKeys.txValue,
      ],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.xs,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => toPct(v, 0),
        color: ct.textMuted,
        fontSize: ct.fontSize.xs,
        fontFamily: ct.monoFamily,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const } },
    },
    series: [
      {
        name: allLabels[growthKeys.sales] ?? growthKeys.sales,
        type: 'line' as const,
        data: salesData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2.5, color: ct.colors.primary },
        itemStyle: { color: ct.colors.primary },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels[growthKeys.customer] ?? growthKeys.customer,
        type: 'line' as const,
        data: customerData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.colors.info },
        itemStyle: { color: ct.colors.info },
      },
      {
        name: allLabels[growthKeys.txValue] ?? growthKeys.txValue,
        type: 'line' as const,
        data: txValueData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.colors.purple, type: 'dashed' as const },
        itemStyle: { color: ct.colors.purple },
      },
    ],
  }
}

export const YoYVarianceChart = memo(function YoYVarianceChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('salesGap')
  const [growthSub, setGrowthSub] = useState<GrowthSubMode>('daily')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  const { chartData, totals, salesGrowthMa7, customerGrowthMa7, txValueGrowthMa7 } = useMemo(() => {
    let cumSalesDiff = 0,
      cumDiscountDiff = 0,
      cumCustomerDiff = 0
    let totalSalesDiff = 0,
      totalDiscountDiff = 0,
      totalCustomerDiff = 0
    let cumCurSales = 0,
      cumPrevSales = 0
    let cumCurCustomers = 0,
      cumPrevCustomers = 0
    let cumCurTxValueSum = 0,
      cumPrevTxValueSum = 0
    let cumCurTxDays = 0,
      cumPrevTxDays = 0

    const rawSalesGrowth: number[] = []
    const rawCustomerGrowth: number[] = []
    const rawTxValueGrowth: number[] = []

    const rows: {
      day: number
      salesDiff: number
      discountDiff: number
      customerDiff: number
      cumSalesDiff: number
      cumDiscountDiff: number
      cumCustomerDiff: number
      salesGrowth: number | null
      customerGrowth: number | null
      txValueGrowth: number | null
      cumSalesGrowth: number | null
      cumCustomerGrowth: number | null
      cumTxValueGrowth: number | null
    }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const prev = prevYearDaily.get(toDateKeyFromParts(year, month, d))
      const curSales = rec?.sales ?? 0
      const prevSales = prev?.sales ?? 0
      const curDiscount = rec?.discountAbsolute ?? 0
      const prevDiscount = prev?.discount ?? 0
      const curCustomers = rec?.customers ?? 0
      const prevCustomers = prev?.customers ?? 0

      const salesDiff = curSales - prevSales
      const discountDiff = curDiscount - prevDiscount
      const customerDiff = curCustomers - prevCustomers

      const curTxValue = curCustomers > 0 ? calculateTransactionValue(curSales, curCustomers) : null
      const prevTxValue =
        prevCustomers > 0 ? calculateTransactionValue(prevSales, prevCustomers) : null

      cumSalesDiff += salesDiff
      cumDiscountDiff += discountDiff
      cumCustomerDiff += customerDiff
      totalSalesDiff += salesDiff
      totalDiscountDiff += discountDiff
      totalCustomerDiff += customerDiff

      // Daily growth rates
      const salesGrowth = prevSales > 0 ? calculateGrowthRate(curSales, prevSales) : null
      const customerGrowth =
        prevCustomers > 0 ? calculateGrowthRate(curCustomers, prevCustomers) : null
      const txValueGrowth =
        curTxValue != null && prevTxValue != null && prevTxValue > 0
          ? calculateGrowthRate(curTxValue, prevTxValue)
          : null

      // Cumulative growth rates
      cumCurSales += curSales
      cumPrevSales += prevSales
      cumCurCustomers += curCustomers
      cumPrevCustomers += prevCustomers
      if (curTxValue != null) {
        cumCurTxValueSum += curTxValue
        cumCurTxDays++
      }
      if (prevTxValue != null) {
        cumPrevTxValueSum += prevTxValue
        cumPrevTxDays++
      }

      const cumSalesGrowth =
        cumPrevSales > 0 ? calculateGrowthRate(cumCurSales, cumPrevSales) : null
      const cumCustomerGrowth =
        cumPrevCustomers > 0 ? calculateGrowthRate(cumCurCustomers, cumPrevCustomers) : null
      const avgCurTx = cumCurTxDays > 0 ? cumCurTxValueSum / cumCurTxDays : 0
      const avgPrevTx = cumPrevTxDays > 0 ? cumPrevTxValueSum / cumPrevTxDays : 0
      const cumTxValueGrowth = avgPrevTx > 0 ? calculateGrowthRate(avgCurTx, avgPrevTx) : null

      // For moving average (use 0 for null)
      rawSalesGrowth.push(salesGrowth ?? 0)
      rawCustomerGrowth.push(customerGrowth ?? 0)
      rawTxValueGrowth.push(txValueGrowth ?? 0)

      rows.push({
        day: d,
        salesDiff,
        discountDiff,
        customerDiff,
        cumSalesDiff,
        cumDiscountDiff,
        cumCustomerDiff,
        salesGrowth,
        customerGrowth,
        txValueGrowth,
        cumSalesGrowth,
        cumCustomerGrowth,
        cumTxValueGrowth,
      })
    }

    // 7-day moving averages
    const sMa7 = maToNull(calculateMovingAverage(rawSalesGrowth, 7))
    const cMa7 = maToNull(calculateMovingAverage(rawCustomerGrowth, 7))
    const tMa7 = maToNull(calculateMovingAverage(rawTxValueGrowth, 7))

    return {
      chartData: rows,
      totals: {
        salesDiff: totalSalesDiff,
        discountDiff: totalDiscountDiff,
        customerDiff: totalCustomerDiff,
      },
      salesGrowthMa7: sMa7,
      customerGrowthMa7: cMa7,
      txValueGrowthMa7: tMa7,
    }
  }, [daily, daysInMonth, year, month, prevYearDaily])

  const data = chartData
    .map((d, i) => ({
      ...d,
      salesGrowthMa7: salesGrowthMa7[i],
      customerGrowthMa7: customerGrowthMa7[i],
      txValueGrowthMa7: txValueGrowthMa7[i],
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  // DataKeys based on growth sub-mode
  const growthKeys = useMemo(
    () =>
      growthSub === 'cumulative'
        ? { sales: 'cumSalesGrowth', customer: 'cumCustomerGrowth', txValue: 'cumTxValueGrowth' }
        : growthSub === 'ma7'
          ? {
              sales: 'salesGrowthMa7',
              customer: 'customerGrowthMa7',
              txValue: 'txValueGrowthMa7',
            }
          : { sales: 'salesGrowth', customer: 'customerGrowth', txValue: 'txValueGrowth' },
    [growthSub],
  )

  const growthTitle =
    growthSub === 'cumulative'
      ? '前年成長率推移（累計: 月初〜当日までの累計ベース）'
      : growthSub === 'ma7'
        ? '前年成長率推移（7日移動平均: ノイズを平滑化）'
        : '前年成長率推移（日別: 売上・客数・客単価の前年比%）'

  const titleMap: Record<ViewType, string> = {
    salesGap: '前年売上差異分析（バー: 日別差異 / ライン: 累計差異）',
    multiGap: '前年複合差異分析（売上・売変・客数の差異を重ね合わせ）',
    growthRate: growthTitle,
  }

  const dataAsRecords = data as unknown as Record<string, unknown>[]

  const option: EChartsOption = useMemo(() => {
    if (view === 'salesGap') {
      return buildSalesGapOption(dataAsRecords, ct, theme)
    }
    if (view === 'multiGap') {
      return buildMultiGapOption(dataAsRecords, ct, theme)
    }
    return buildGrowthRateOption(dataAsRecords, growthKeys, ct, theme)
  }, [view, dataAsRecords, growthKeys, ct, theme])

  return (
    <Wrapper aria-label="前年差異チャート">
      <HeaderRow>
        <Title>
          {titleMap[view]}
          <ChartHelpButton guide={CHART_GUIDES['yoy-waterfall']} />
        </Title>
        <ToggleRow>
          <ViewToggle>
            {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
              <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ViewBtn>
            ))}
          </ViewToggle>
          {view === 'growthRate' && (
            <>
              <Sep>|</Sep>
              <ViewToggle>
                {(Object.keys(GROWTH_SUB_LABELS) as GrowthSubMode[]).map((s) => (
                  <ViewBtn key={s} $active={growthSub === s} onClick={() => setGrowthSub(s)}>
                    {GROWTH_SUB_LABELS[s]}
                  </ViewBtn>
                ))}
              </ViewToggle>
            </>
          )}
        </ToggleRow>
      </HeaderRow>
      <SummaryRow>
        <SummaryItem $positive={totals.salesDiff >= 0}>
          <SummaryLabel>売上差:</SummaryLabel>
          {totals.salesDiff >= 0 ? '+' : ''}
          {toComma(totals.salesDiff)}
        </SummaryItem>
        <SummaryItem $positive={totals.discountDiff <= 0}>
          <SummaryLabel>売変差:</SummaryLabel>
          {totals.discountDiff >= 0 ? '+' : ''}
          {toComma(totals.discountDiff)}
        </SummaryItem>
        <SummaryItem $positive={totals.customerDiff >= 0}>
          <SummaryLabel>客数差:</SummaryLabel>
          {totals.customerDiff >= 0 ? '+' : ''}
          {toComma(totals.customerDiff)}人
        </SummaryItem>
      </SummaryRow>
      <EChart option={option} ariaLabel="前年差異チャート" />
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
    </Wrapper>
  )
})
