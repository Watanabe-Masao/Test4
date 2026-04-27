/**
 * CategoryFactorEChart — カテゴリ別要因分解トルネードチャート
 *
 * プラス要因を右、マイナス要因を左にスタック表示する横棒グラフ。
 * CategoryFactorBreakdown から分離。
 *
 * @guard G5 hook ≤300行 — コンポーネント分割
 *
 * @responsibility R:unclassified
 */
import { useMemo, memo } from 'react'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import type { BarSeriesOption, LineSeriesOption } from 'echarts'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import type { DecompLevel, WaterfallFactorItem } from './categoryFactorBreakdown.types'
import { FACTOR_COLORS } from './FactorTooltip'

interface Props {
  readonly waterfallItems: WaterfallFactorItem[]
  readonly activeLevel: DecompLevel
  readonly hasCust: boolean
  readonly compact: boolean
  readonly chartH: number
  readonly theme: AppTheme
  readonly fmt: (v: number) => string
  readonly fmtCurrency: (v: number | null) => string
  readonly prevLabel: string
  readonly curLabel: string
  readonly onClick: (params: Record<string, unknown>) => void
}

export const CategoryFactorEChart = memo(function CategoryFactorEChart({
  waterfallItems,
  activeLevel,
  hasCust,
  compact,
  chartH,
  theme,
  fmt,
  fmtCurrency,
  prevLabel,
  curLabel,
  onClick,
}: Props) {
  const option = useMemo((): EChartsOption => {
    const names = waterfallItems.map((d) => d.name)
    const barSize = compact ? 18 : 22

    type FactorDef = {
      name: string
      color: string
      getValue: (d: WaterfallFactorItem) => number
    }
    const factors: FactorDef[] = []
    if (hasCust)
      factors.push({ name: '客数効果', color: FACTOR_COLORS.cust, getValue: (d) => d.custEffect })
    if (activeLevel === 2)
      factors.push({
        name: '客単価効果',
        color: FACTOR_COLORS.ticket,
        getValue: (d) => d.ticketEffect,
      })
    if (activeLevel >= 3)
      factors.push({ name: '点数効果', color: FACTOR_COLORS.qty, getValue: (d) => d.qtyEffect })
    if (activeLevel === 3)
      factors.push({ name: '単価効果', color: FACTOR_COLORS.price, getValue: (d) => d.priceEffect })
    if (activeLevel === 5) {
      factors.push({
        name: '価格効果',
        color: FACTOR_COLORS.price,
        getValue: (d) => d.pricePureEffect,
      })
      factors.push({
        name: '構成比変化効果',
        color: FACTOR_COLORS.mix,
        getValue: (d) => d.mixEffect,
      })
    }

    const seriesList: BarSeriesOption[] = []
    for (const f of factors) {
      seriesList.push({
        name: f.name,
        type: 'bar',
        stack: 'positive',
        data: waterfallItems.map((d) => {
          const v = f.getValue(d)
          return v > 0 ? v : 0
        }),
        itemStyle: { color: f.color, opacity: 0.9, borderRadius: [2, 2, 2, 2] },
        barWidth: barSize,
        barGap: '-100%',
      })
      seriesList.push({
        name: f.name,
        type: 'bar',
        stack: 'negative',
        data: waterfallItems.map((d) => {
          const v = f.getValue(d)
          return v < 0 ? v : 0
        }),
        itemStyle: { color: f.color, opacity: 0.9, borderRadius: [2, 2, 2, 2] },
        barWidth: barSize,
        barGap: '-100%',
      })
    }

    const netTotals = waterfallItems.map((d) => factors.reduce((sum, f) => sum + f.getValue(d), 0))

    const fmtLineLabel = (v: unknown): string => {
      const n = typeof v === 'number' ? v : 0
      if (n === 0) return ''
      return fmt(n)
    }

    const lineSeriesList: LineSeriesOption[] = [
      {
        name: '効果合計',
        type: 'line',
        data: netTotals,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        label: {
          show: true,
          position: 'right',
          formatter: (p) => fmtLineLabel(p.value),
          fontSize: 9,
          color: '#8b5cf6',
          fontFamily: theme.typography.fontFamily.mono,
        },
        z: 10,
      },
    ]

    return {
      grid: {
        ...standardGrid(),
        left: compact ? 60 : 80,
        right: compact ? 50 : 70,
        top: 10,
        bottom: 10,
      },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const first = arr[0] as { dataIndex: number } | undefined
          if (!first) return ''
          const item = waterfallItems[first.dataIndex]
          if (!item) return ''

          const pL = prevLabel
          const cL = curLabel
          let html = `<strong style="font-size:13px">${item.name}</strong><br/>`
          html += `<span style="opacity:0.7">${pL}: ${fmtCurrency(item.prevAmount)} → ${cL}: ${fmtCurrency(item.curAmount)}</span><br/>`
          html += `<strong>増減: ${item.totalChange >= 0 ? '+' : ''}${fmtCurrency(item.totalChange)}</strong><br/>`
          html +=
            '<hr style="margin:4px 0;border:none;border-top:1px solid rgba(128,128,128,0.3)"/>'

          let netSum = 0
          for (const fe of factors) {
            const v = fe.getValue(item)
            if (v === 0) continue
            netSum += v
            const sign = v >= 0 ? '+' : ''
            html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${fe.color};margin-right:4px"></span>`
            html += `${fe.name}: ${sign}${fmtCurrency(v)}<br/>`
          }
          html +=
            '<hr style="margin:4px 0;border:none;border-top:1px solid rgba(128,128,128,0.3)"/>'
          const netSign = netSum >= 0 ? '+' : ''
          html += `<span style="color:#8b5cf6">● 効果合計: ${netSign}${fmtCurrency(netSum)}</span>`
          if (item.hasChildren)
            html += '<br/><br/><em style="opacity:0.6;font-size:11px">クリックでドリルダウン</em>'
          return html
        },
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => fmt(v),
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        inverse: true,
        axisLabel: {
          color: theme.colors.text,
          fontSize: compact ? 9 : 11,
          fontFamily: theme.typography.fontFamily.primary,
          width: compact ? 55 : 75,
          overflow: 'truncate' as const,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        ...seriesList,
        ...lineSeriesList,
        {
          type: 'bar' as const,
          data: [] as number[],
          markLine: {
            silent: true,
            symbol: 'none' as const,
            lineStyle: {
              color: theme.colors.text3,
              width: 1,
              type: 'solid' as const,
              opacity: 0.5,
            },
            data: [{ xAxis: 0 }],
            label: { show: false },
          },
        },
      ],
    }
  }, [waterfallItems, activeLevel, hasCust, compact, theme, fmt, fmtCurrency, prevLabel, curLabel])

  return (
    <EChart
      option={option}
      height={chartH}
      onClick={onClick}
      ariaLabel="カテゴリ別要因分解トルネードチャート"
    />
  )
})
