/**
 * YoYWaterfallChart のサブコンポーネント
 *
 * - DecompHelpSection: 分解レベルの計算式説明パネル
 * - SalesSummaryRow: 売上サマリー行（前期/当期/差額/比率）
 * - PISummaryRow: PI値・点単価サマリー行
 * - WaterfallBarChart: ウォーターフォールバーチャート描画
 *
 * @responsibility R:unclassified
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  yenYAxis,
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
  data: readonly WaterfallItem[]
}

export const WaterfallBarChart = memo(function WaterfallBarChart({ data }: WaterfallBarChartProps) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()

  const option = useMemo((): EChartsOption => {
    const names = data.map((d) => d.name)
    const needsRotation = data.length > 6
    return {
      grid: {
        ...standardGrid(),
        top: 30,
        bottom: needsRotation ? 60 : 30,
      },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const p = arr[0] as { dataIndex: number } | undefined
          if (!p) return ''
          const item = data[p.dataIndex]
          if (!item) return ''
          return `${item.name}<br/>${fmtCurrency(item.value)}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.primary,
          rotate: needsRotation ? -30 : 0,
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
          barMaxWidth: 40,
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
          barMaxWidth: 40,
          label: {
            show: data.length <= 8,
            position: 'top' as const,
            distance: 4,
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
  }, [data, theme, fmt, fmtCurrency])

  return <EChart option={option} height={260} ariaLabel="前年比較ウォーターフォールチャート" />
})
