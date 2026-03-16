import { memo, useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toComma, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
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

export const YoYVarianceChart = memo(function YoYVarianceChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()
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
  const growthKeys =
    growthSub === 'cumulative'
      ? { sales: 'cumSalesGrowth', customer: 'cumCustomerGrowth', txValue: 'cumTxValueGrowth' }
      : growthSub === 'ma7'
        ? { sales: 'salesGrowthMa7', customer: 'customerGrowthMa7', txValue: 'txValueGrowthMa7' }
        : { sales: 'salesGrowth', customer: 'customerGrowth', txValue: 'txValueGrowth' }

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
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="74%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.7} />

          {/* Sales gap view */}
          {view === 'salesGap' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toAxisYen}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toAxisYen}
                width={55}
              />
              <Bar yAxisId="left" dataKey="salesDiff" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.salesDiff >= 0 ? ct.colors.success : ct.colors.danger}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumSalesDiff"
                stroke={ct.colors.primary}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </>
          )}

          {/* Multi-gap view */}
          {view === 'multiGap' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toAxisYen}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${toComma(v)}人`}
                width={50}
              />
              <Bar yAxisId="left" dataKey="salesDiff" maxBarSize={12} opacity={0.7}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.salesDiff >= 0 ? ct.colors.primary : ct.colors.slateDark}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="discountDiff"
                stroke={ct.colors.danger}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="customerDiff"
                stroke={ct.colors.info}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </>
          )}

          {/* Growth rate view - sub-mode selects dataKeys */}
          {view === 'growthRate' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => toPct(v, 0)}
                width={45}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={growthKeys.sales}
                stroke={ct.colors.primary}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={growthKeys.customer}
                stroke={ct.colors.info}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={growthKeys.txValue}
                stroke={ct.colors.purple}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </>
          )}

          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => {
                if (value == null) return ['-', allLabels[name] ?? name]
                const n = name
                if (n.includes('Growth') || n.includes('growth') || n.includes('Ma7')) {
                  return [toPct(value as number), allLabels[n] ?? n]
                }
                if (n.includes('customer') || n.includes('Customer')) {
                  const v = value as number
                  return [`${v >= 0 ? '+' : ''}${toComma(v)}人`, allLabels[n] ?? n]
                }
                const v = value as number
                return [`${v >= 0 ? '+' : ''}${toComma(v)}`, allLabels[n] ?? n]
              },
              labelFormatter: (label) => `${label}日`,
            })}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
          />
        </ComposedChart>
      </ResponsiveContainer>
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
