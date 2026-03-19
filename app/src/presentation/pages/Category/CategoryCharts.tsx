import { memo, useState, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { Chip } from '@/presentation/components/common'
import { calculateShare } from '@/domain/calculations/utils'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardTooltip,
  standardGrid,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { toPct, useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { PieWrapper, PieTitle, PieToggle } from './CategoryPage.styles'
import type { CategoryChartItem, PieMode, ChartView } from './categoryData'
import { buildParetoData } from './categoryData'

const MODE_LABELS: Record<PieMode, string> = {
  cost: '原価',
  price: '売価',
  crossMult: '相乗積',
}

/** 構成比チャート（原価 / 売価 / 相乗積 切替、円グラフ / パレート図 切替） */
export const CompositionChart = memo(function CompositionChart({
  items,
}: {
  items: CategoryChartItem[]
}) {
  const theme = useTheme() as AppTheme
  const { format: fmtCurrency } = useCurrencyFormat()
  const [mode, setMode] = useState<PieMode>('cost')
  const [view, setView] = useState<ChartView>('pie')

  const totalPrice = items.reduce((s, d) => s + d.price, 0)
  const isCrossMult = mode === 'crossMult'

  const data = useMemo(
    () =>
      items
        .map((d) => {
          let value: number
          if (mode === 'cost') {
            value = Math.abs(d.cost)
          } else if (mode === 'price') {
            value = Math.abs(d.price)
          } else {
            value = Math.abs(calculateShare(d.price - d.cost, totalPrice))
          }
          return { name: d.label, value, color: d.color }
        })
        .filter((d) => d.value > 0),
    [items, mode, totalPrice],
  )

  const tooltipLabel = MODE_LABELS[mode]
  const tooltipFormatter = isCrossMult
    ? (value: number) => toPct(value, 2)
    : (value: number) => fmtCurrency(value)

  const pieOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'item' as const,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number }
          return `${p.name}<br/>${tooltipLabel}: ${tooltipFormatter(p.value)}`
        },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '70%'],
          center: ['50%', '48%'],
          data: data.map((d) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: d.color, opacity: 0.85 },
          })),
          label: {
            formatter: (params: unknown) => {
              const p = params as { name: string; percent: number }
              return p.percent >= 3 ? `${p.name} ${toPct(p.percent / 100)}` : ''
            },
            color: theme.colors.text3,
            fontSize: 10,
            fontFamily: theme.typography.fontFamily.primary,
          },
          itemStyle: { borderWidth: 2, borderColor: theme.colors.bg3 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        },
      ],
    }),
    [data, theme, tooltipLabel, tooltipFormatter],
  )

  const paretoData = useMemo(() => buildParetoData(data), [data])

  const paretoOption = useMemo<EChartsOption>(
    () => ({
      grid: { ...standardGrid(), right: 50 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const list = params as { seriesName: string; value: number; marker: string }[]
          const title = (list[0] as { axisValueLabel?: string }).axisValueLabel ?? ''
          const rows = list
            .map((p) => {
              if (p.seriesName === 'cumPct') {
                return `${p.marker} 累計: ${toPct(p.value)}`
              }
              return `${p.marker} ${tooltipLabel}: ${tooltipFormatter(p.value)}`
            })
            .join('<br/>')
          return `${title}<br/>${rows}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: paretoData.map((d) => d.name),
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.primary,
          rotate: 30,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value' as const,
          position: 'left' as const,
          axisLabel: {
            formatter: isCrossMult ? (v: number) => toPct(v, 0) : (v: number) => toCommaYen(v),
            color: theme.colors.text3,
            fontSize: 10,
            fontFamily: theme.typography.fontFamily.mono,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
          },
        },
        {
          type: 'value' as const,
          position: 'right' as const,
          min: 0,
          max: 1,
          axisLabel: {
            formatter: (v: number) => toPct(v, 0),
            color: theme.colors.text3,
            fontSize: 10,
            fontFamily: theme.typography.fontFamily.mono,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'bar' as const,
          yAxisIndex: 0,
          data: paretoData.map((d) => ({
            value: d.value,
            itemStyle: { color: d.color, opacity: 0.8 },
          })),
          barMaxWidth: 32,
        },
        {
          type: 'line' as const,
          name: 'cumPct',
          yAxisIndex: 1,
          data: paretoData.map((d) => d.cumPct),
          smooth: true,
          lineStyle: { width: 2, color: theme.colors.palette.dangerDark },
          itemStyle: { color: theme.colors.palette.dangerDark },
          symbol: 'circle' as const,
          symbolSize: 6,
        },
      ],
    }),
    [paretoData, theme, isCrossMult, tooltipLabel, tooltipFormatter],
  )

  if (data.length === 0) return null

  return (
    <PieWrapper>
      <PieTitle>カテゴリ別 構成比</PieTitle>
      <PieToggle>
        {(Object.keys(MODE_LABELS) as PieMode[]).map((m) => (
          <Chip key={m} $active={mode === m} onClick={() => setMode(m)}>
            {MODE_LABELS[m]}
          </Chip>
        ))}
        <span style={{ width: 8 }} />
        <Chip $active={view === 'pie'} onClick={() => setView('pie')}>
          円グラフ
        </Chip>
        <Chip $active={view === 'pareto'} onClick={() => setView('pareto')}>
          パレート図
        </Chip>
      </PieToggle>
      {view === 'pie' ? (
        <EChart option={pieOption} height={260} ariaLabel="カテゴリ別構成比円グラフ" />
      ) : (
        <EChart option={paretoOption} height={260} ariaLabel="カテゴリ別パレート図" />
      )}
    </PieWrapper>
  )
})
