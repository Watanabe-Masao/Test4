/**
 * DiscountAnalysisPanel — 売変選択時の売変分析パネル
 *
 * 日別の売変推移（棒グラフ）+ 売変率ラインを表示。
 * 前年比較がある場合は前年の売変も重ねる。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { DailyRecord } from '@/domain/models/record'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip } from './echartsOptionBuilders'
import { useCurrencyFormatter, useChartTheme } from './chartTheme'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { sc } from '@/presentation/theme/semanticColors'

interface Props {
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly year: number
  readonly month: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; customers?: number }
  >
}

export const DiscountAnalysisPanel = memo(function DiscountAnalysisPanel({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
}: Props) {
  const theme = useTheme() as AppTheme
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const { days, curDiscount, prevDiscount, curRate, totalCur, totalPrev } = useMemo(() => {
    const d: string[] = []
    const cur: number[] = []
    const prev: number[] = []
    const rate: (number | null)[] = []
    let sumCur = 0
    let sumPrev = 0

    for (let i = 1; i <= daysInMonth; i++) {
      d.push(`${i}`)
      const rec = daily.get(i)
      const disc = rec?.discountAmount ?? 0
      const sales = rec?.sales ?? 0
      cur.push(disc)
      sumCur += disc

      const prevKey = `${year - 1}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const prevRec = prevYearDaily?.get(prevKey)
      prev.push(prevRec?.discount ?? 0)
      sumPrev += prevRec?.discount ?? 0

      rate.push(sales > 0 ? disc / sales : null)
    }

    return {
      days: d,
      curDiscount: cur,
      prevDiscount: prev,
      curRate: rate,
      totalCur: sumCur,
      totalPrev: sumPrev,
    }
  }, [daily, daysInMonth, year, month, prevYearDaily])

  const hasPrev = prevYearDaily != null && prevYearDaily.size > 0

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
