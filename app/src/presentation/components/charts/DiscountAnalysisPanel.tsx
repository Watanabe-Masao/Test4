/**
 * DiscountAnalysisPanel — 売変選択時の売変分析パネル
 *
 * 日別の売変推移（棒グラフ）+ 売変率ラインを表示。
 * 前年比較がある場合は前年の売変も重ねる。
 *
 * データソース: DuckDB store_day_summary（DailyRecord Map 非依存）。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import {
  useDuckDBStoreDaySummary,
  useDuckDBAggregatedRates,
} from '@/application/hooks/useDuckDBQuery'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip } from './echartsOptionBuilders'
import { useCurrencyFormatter, useChartTheme } from './chartTheme'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { sc } from '@/presentation/theme/semanticColors'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export const DiscountAnalysisPanel = memo(function DiscountAnalysisPanel({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const theme = useTheme() as AppTheme
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  // 当期日別データ
  const curDaily = useDuckDBStoreDaySummary(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  // 前年日別データ
  const prevDateRange = prevYearScope?.dateRange
  const prevDaily = useDuckDBStoreDaySummary(
    duckConn,
    duckDataVersion,
    prevDateRange,
    selectedStoreIds,
    true,
  )

  // 当期集約
  const curAgg = useDuckDBAggregatedRates(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )
  // 前年集約
  const prevAgg = useDuckDBAggregatedRates(
    duckConn,
    duckDataVersion,
    prevDateRange,
    selectedStoreIds,
    true,
  )

  const { days, curDiscount, prevDiscount, curRate } = useMemo(() => {
    const d: string[] = []
    const cur: number[] = []
    const prev: number[] = []
    const rate: (number | null)[] = []

    // 当期: 日別サマリーから discount_amount と sales を取得
    const curRows = curDaily.data ?? []
    // 日→集約（複数店舗の場合を考慮）
    const curByDay = new Map<number, { disc: number; sales: number }>()
    for (const row of curRows) {
      const existing = curByDay.get(row.day) ?? { disc: 0, sales: 0 }
      existing.disc += row.discountAmount
      existing.sales += row.sales
      curByDay.set(row.day, existing)
    }

    // 前年: 同様
    const prevRows = prevDaily.data ?? []
    const prevByDay = new Map<number, number>()
    for (const row of prevRows) {
      prevByDay.set(row.day, (prevByDay.get(row.day) ?? 0) + row.discountAmount)
    }

    // 日数は当期データから推定
    const maxDay = curByDay.size > 0 ? Math.max(...curByDay.keys()) : 0
    for (let i = 1; i <= maxDay; i++) {
      d.push(`${i}`)
      const c = curByDay.get(i)
      cur.push(c?.disc ?? 0)
      prev.push(prevByDay.get(i) ?? 0)
      rate.push(c && c.sales > 0 ? c.disc / c.sales : null)
    }

    return { days: d, curDiscount: cur, prevDiscount: prev, curRate: rate }
  }, [curDaily.data, prevDaily.data])

  const hasPrev = (prevDaily.data?.length ?? 0) > 0
  const totalCur = curAgg.data?.totalDiscountAbsolute ?? 0
  const totalPrev = prevAgg.data?.totalDiscountAbsolute ?? 0

  const option = useMemo((): EChartsOption => {
    const series: EChartsOption['series'] = [
      {
        name: '当期売変',
        type: 'bar' as const,
        data: curDiscount,
        itemStyle: { color: sc.negative, opacity: 0.8 },
        barWidth: hasPrev ? '35%' : '60%',
      },
    ]

    if (hasPrev) {
      series.push({
        name: '前年売変',
        type: 'bar' as const,
        data: prevDiscount,
        itemStyle: { color: theme.colors.text4, opacity: 0.4 },
        barWidth: '35%',
      })
    }

    series.push({
      name: '売変率',
      type: 'line' as const,
      data: curRate,
      yAxisIndex: 1,
      lineStyle: { color: ct.colors.primary, width: 1.5 },
      itemStyle: { color: ct.colors.primary },
      symbol: 'circle',
      symbolSize: 3,
      connectNulls: true,
    })

    return {
      grid: { ...standardGrid(), top: 30, bottom: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { fontSize: 9, color: theme.colors.text3 },
      },
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: { color: theme.colors.text3, fontSize: 9 },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLabel: {
            color: theme.colors.text4,
            fontSize: 9,
            formatter: (v: number) => fmt(v),
          },
          splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3 } },
        },
        {
          type: 'value' as const,
          axisLabel: {
            color: theme.colors.text4,
            fontSize: 9,
            formatter: (v: number) => formatPercent(v),
          },
          splitLine: { show: false },
        },
      ],
      series,
    }
  }, [curDiscount, prevDiscount, curRate, days, hasPrev, theme, ct, fmt])

  const delta = totalCur - totalPrev

  return (
    <div>
      <SummaryRow>
        <SummaryItem>
          当月売変合計: <Value>{formatCurrency(totalCur)}</Value>
        </SummaryItem>
        {hasPrev && (
          <SummaryItem>
            前年差:{' '}
            <DeltaValue $positive={delta >= 0}>
              {delta >= 0 ? '+' : ''}
              {formatCurrency(delta)}
            </DeltaValue>
          </SummaryItem>
        )}
      </SummaryRow>
      <EChart option={option} height={280} ariaLabel="売変分析チャート" />
    </div>
  )
})

// ── Styles ──

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const SummaryItem = styled.span``

const Value = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const DeltaValue = styled.span<{ $positive: boolean }>`
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? sc.positive : sc.negative)};
`
