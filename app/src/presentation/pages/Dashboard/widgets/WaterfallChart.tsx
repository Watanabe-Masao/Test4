import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { WidgetContext } from './types'
import { sc } from '@/presentation/theme/semanticColors'
import { Wrapper, Title } from './WaterfallChart.styles'

interface WaterfallItem {
  name: string
  value: number
  // For waterfall: invisible base + visible bar
  base: number
  bar: number
  isTotal?: boolean
}

export const WaterfallChartWidget = memo(function WaterfallChartWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { result: r } = ctx
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()

  const data = useMemo(() => {
    const totalSales = r.totalSales
    const totalCost = r.totalCost
    const discountLoss = -r.totalDiscount
    const costInclusion = -r.totalCostInclusion

    // Waterfall items: Start from sales, subtract factors
    const items: WaterfallItem[] = []

    // 1. Total Sales (starting point)
    items.push({
      name: '売上高',
      value: totalSales,
      base: 0,
      bar: totalSales,
      isTotal: true,
    })

    // 2. Cost of goods (negative impact from sales)
    items.push({
      name: '仕入原価',
      value: -totalCost,
      base: totalSales - totalCost,
      bar: totalCost,
    })

    // Running total after cost = markup amount (= grossSales - totalCost)
    // 3. Discount loss (negative impact)
    const afterCost = totalSales - totalCost
    items.push({
      name: '売変ロス',
      value: discountLoss,
      base: afterCost + discountLoss,
      bar: Math.abs(discountLoss),
    })

    // 4. Consumables (negative impact)
    const afterDiscount = afterCost + discountLoss
    items.push({
      name: '原価算入費',
      value: costInclusion,
      base: afterDiscount + costInclusion,
      bar: Math.abs(costInclusion),
    })

    // 5. Gross Profit (result)
    const finalGP = afterDiscount + costInclusion
    items.push({
      name: '粗利益',
      value: finalGP,
      base: 0,
      bar: finalGP,
      isTotal: true,
    })

    return items
  }, [r])

  const option = useMemo((): EChartsOption => {
    const names = data.map((d) => d.name)
    return {
      grid: { ...standardGrid(), top: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          // スタックバー方式: arr[0]=透明ベース, arr[1]=表示バー — 表示バーから dataIndex を取得
          const p = (arr as { dataIndex: number }[]).find(
            (s: { seriesIndex?: number }) => s.seriesIndex === 1,
          ) ?? (arr[0] as { dataIndex: number } | undefined)
          if (!p) return ''
          const item = data[p.dataIndex]
          if (!item) return ''
          return `${item.name}<br/>${toCommaYen(item.value)}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.primary,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      yAxis: yenYAxis(theme),
      series: [
        // 透明ベース（ウォーターフォールの浮遊バー効果）
        {
          type: 'bar' as const,
          stack: 'wf',
          data: data.map((d) => d.base),
          itemStyle: { color: 'transparent', borderColor: 'transparent' },
          emphasis: { disabled: true },
          barWidth: '60%',
        },
        // 表示バー
        {
          type: 'bar' as const,
          stack: 'wf',
          data: data.map((d) => {
            const color = d.isTotal
              ? theme.colors.palette.primary
              : d.value >= 0
                ? sc.positive
                : sc.negative
            return {
              value: d.bar,
              itemStyle: { color, opacity: 0.85 },
            }
          }),
          barWidth: '60%',
          label: {
            show: true,
            position: 'top' as const,
            formatter: (params: unknown) => {
              const p = params as { dataIndex: number }
              const item = data[p.dataIndex]
              return item ? fmt(item.value) : ''
            },
            fontSize: 9,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
          },
        },
      ],
    }
  }, [data, theme, fmt])

  return (
    <Wrapper>
      <Title>粗利益ウォーターフォール（要因分解）</Title>
      <EChart option={option} height={340} ariaLabel="粗利益ウォーターフォールチャート" />
    </Wrapper>
  )
})
