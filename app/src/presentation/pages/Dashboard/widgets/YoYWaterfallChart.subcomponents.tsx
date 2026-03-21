/**
 * YoYWaterfallChart のサブコンポーネント
 *
 * - DecompHelpSection: 分解レベルの計算式説明パネル
 * - SalesSummaryRow: 売上サマリー行（前期/当期/差額/比率）
 * - PISummaryRow: PI値・点単価サマリー行
 * - WaterfallBarChart: ウォーターフォールバーチャート描画
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import {
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  HelpToggle,
  HelpBox,
  HelpFormula,
} from './YoYWaterfallChart.styles'
import { DECOMP_HELP } from './YoYWaterfallChart.data'
import type { WaterfallItem, DecompLevel } from './YoYWaterfallChart.data'

/* ------------------------------------------------------------------ */
/*  DecompHelpSection                                                  */
/* ------------------------------------------------------------------ */

interface DecompHelpSectionProps {
  showHelp: boolean
  onToggle: () => void
  activeLevel: DecompLevel
}

export const DecompHelpSection = memo(function DecompHelpSection({
  showHelp,
  onToggle,
  activeLevel,
}: DecompHelpSectionProps) {
  const help = DECOMP_HELP[activeLevel]
  return (
    <>
      <HelpToggle onClick={onToggle}>{showHelp ? '\u25BC' : '\u25B6'} 計算式の説明</HelpToggle>
      {showHelp && help && (
        <HelpBox>
          <strong>{help.title}</strong>
          <div style={{ marginTop: 4 }}>
            不変条件: 全効果の合計 = 当期売上 - 前期売上（シャープリー効率性公理）
          </div>
          {help.items.map((item) => (
            <div key={item.label} style={{ marginTop: 8 }}>
              <strong>{item.label}</strong>: {item.desc}
              <HelpFormula>{item.formula}</HelpFormula>
            </div>
          ))}
        </HelpBox>
      )}
    </>
  )
})

/* ------------------------------------------------------------------ */
/*  SalesSummaryRow                                                    */
/* ------------------------------------------------------------------ */

interface SalesSummaryRowProps {
  prevLabel: string
  curLabel: string
  prevSales: number
  curSales: number
}

export const SalesSummaryRow = memo(function SalesSummaryRow({
  prevLabel,
  curLabel,
  prevSales,
  curSales,
}: SalesSummaryRowProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const yoyDiff = curSales - prevSales
  const yoyRatio = calculateYoYRatio(curSales, prevSales)

  return (
    <SummaryRow>
      <SummaryItem>
        <SummaryLabel>{prevLabel}売上</SummaryLabel>
        <SummaryValue>{fmtCurrency(prevSales)}</SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>{curLabel}売上</SummaryLabel>
        <SummaryValue>{fmtCurrency(curSales)}</SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>差額</SummaryLabel>
        <SummaryValue $color={sc.cond(yoyDiff >= 0)}>
          {yoyDiff >= 0 ? '+' : ''}
          {fmtCurrency(yoyDiff)}
        </SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>比率</SummaryLabel>
        <SummaryValue $color={sc.cond(yoyRatio >= 1)}>{formatPercent(yoyRatio)}</SummaryValue>
      </SummaryItem>
    </SummaryRow>
  )
})

/* ------------------------------------------------------------------ */
/*  PISummaryRow                                                       */
/* ------------------------------------------------------------------ */

interface PISummaryRowProps {
  prevLabel: string
  curLabel: string
  prevPI: number
  curPI: number
  prevPPI: number
  curPPI: number
}

export const PISummaryRow = memo(function PISummaryRow({
  prevLabel,
  curLabel,
  prevPI,
  curPI,
  prevPPI,
  curPPI,
}: PISummaryRowProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  return (
    <SummaryRow>
      <SummaryItem>
        <SummaryLabel>PI値({prevLabel})</SummaryLabel>
        <SummaryValue>{prevPI.toFixed(1)}点</SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>PI値({curLabel})</SummaryLabel>
        <SummaryValue $color={sc.cond(curPI >= prevPI)}>{curPI.toFixed(1)}点</SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>点単価({prevLabel})</SummaryLabel>
        <SummaryValue>{fmtCurrency(Math.round(prevPPI))}</SummaryValue>
      </SummaryItem>
      <SummaryItem>
        <SummaryLabel>点単価({curLabel})</SummaryLabel>
        <SummaryValue $color={sc.cond(curPPI >= prevPPI)}>
          {fmtCurrency(Math.round(curPPI))}
        </SummaryValue>
      </SummaryItem>
    </SummaryRow>
  )
})

/* ------------------------------------------------------------------ */
/*  WaterfallBarChart                                                  */
/* ------------------------------------------------------------------ */

interface WaterfallBarChartProps {
  data: WaterfallItem[]
}

export const WaterfallBarChart = memo(function WaterfallBarChart({ data }: WaterfallBarChartProps) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()

  const option = useMemo((): EChartsOption => {
    // 要因項目のみ抽出（前期売上・当期売上の合計バーを除く）
    const factors = data.filter((d) => !d.isTotal)
    if (factors.length === 0) return {}

    const names = factors.map((d) => d.name)
    const netTotal = factors.reduce((sum, d) => sum + d.value, 0)

    return {
      grid: {
        ...standardGrid(),
        left: 110,
        right: 80,
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
          const item = factors[first.dataIndex]
          if (!item) return ''
          const sign = item.value >= 0 ? '+' : ''
          let html = `<strong>${item.name}</strong><br/>`
          html += `${sign}${fmtCurrency(item.value)}`
          html += `<br/><hr style="margin:4px 0;border:none;border-top:1px solid rgba(128,128,128,0.3)"/>`
          const netSign = netTotal >= 0 ? '+' : ''
          html += `<span style="color:#8b5cf6">● 効果合計: ${netSign}${fmtCurrency(netTotal)}</span>`
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
          fontSize: 11,
          fontFamily: theme.typography.fontFamily.primary,
          width: 100,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar' as const,
          data: factors.map((d) => ({
            value: d.value,
            itemStyle: {
              color: d.value >= 0 ? sc.positive : sc.negative,
              opacity: 0.85,
              borderRadius: [2, 2, 2, 2],
            },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right' as const,
            distance: 4,
            formatter: (params: unknown) => {
              const p = params as { dataIndex: number }
              const item = factors[p.dataIndex]
              if (!item) return ''
              return fmt(item.value)
            },
            fontSize: 9,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
          },
        },
        {
          name: '効果合計',
          type: 'line' as const,
          data: factors.map(() => netTotal),
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' },
          label: {
            show: true,
            position: 'right' as const,
            formatter: (p: unknown) => {
              const params = p as { dataIndex: number }
              return params.dataIndex === 0 ? fmt(netTotal) : ''
            },
            fontSize: 9,
            color: '#8b5cf6',
            fontFamily: theme.typography.fontFamily.mono,
          },
          z: 10,
        },
      ],
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: theme.colors.border, type: 'dashed' as const },
        data: [{ xAxis: 0 }],
        label: { show: false },
      },
    }
  }, [data, theme, fmt, fmtCurrency])

  const chartH = Math.max(120, data.filter((d) => !d.isTotal).length * 50 + 40)

  return <EChart option={option} height={chartH} ariaLabel="要因分解トルネードチャート" />
})
