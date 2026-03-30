import { memo, useState, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { useChartTheme, toComma } from './chartTheme'

import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import {
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
} from './YoYVarianceChart.styles'
import {
  type ViewType,
  type GrowthSubMode,
  VIEW_LABELS,
  GROWTH_SUB_LABELS,
  buildSalesGapOption,
  buildMultiGapOption,
  buildGrowthRateOption,
} from './YoYVarianceChart.builders'
import type { DailyRecord } from '@/domain/models/record'
import { aggregateYoYVarianceData } from './YoYVarianceChart.vm'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
  rangeStart?: number
  rangeEnd?: number
}

export const YoYVarianceChart = memo(function YoYVarianceChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('salesGap')
  const [growthSub, setGrowthSub] = useState<GrowthSubMode>('daily')
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? daysInMonth

  const { chartData, totals, salesGrowthMa7, customerGrowthMa7, txValueGrowthMa7 } = useMemo(
    () => aggregateYoYVarianceData(daily, daysInMonth, year, month, prevYearDaily),
    [daily, daysInMonth, year, month, prevYearDaily],
  )

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
    <ChartCard
      title={titleMap[view]}
      guide={CHART_GUIDES['yoy-waterfall']}
      ariaLabel="前年差異チャート"
      toolbar={
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
      }
    >
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
    </ChartCard>
  )
})
