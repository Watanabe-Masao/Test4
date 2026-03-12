/**
 * YoYWaterfallChart のサブコンポーネント
 *
 * - DecompHelpSection: 分解レベルの計算式説明パネル
 * - SalesSummaryRow: 売上サマリー行（前期/当期/差額/比率）
 * - PISummaryRow: PI値・点単価サマリー行
 * - WaterfallBarChart: ウォーターフォールバーチャート描画
 */
import { memo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from '@/presentation/components/charts'
import { createChartTooltip } from '@/presentation/components/charts/createChartTooltip'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { safeDivide } from '@/domain/calculations/utils'
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
      <HelpToggle onClick={onToggle}>{showHelp ? '▼' : '▶'} 計算式の説明</HelpToggle>
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
  const yoyRatio = safeDivide(curSales, prevSales, 0)

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
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()

  const colors = {
    positive: sc.positive,
    negative: sc.negative,
    total: ct.colors.primary,
  }

  return (
    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={360}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: ct.fontSize.sm, fill: ct.text, fontFamily: ct.fontFamily }}
          axisLine={{ stroke: ct.grid }}
          tickLine={false}
          interval={0}
          angle={data.length > 6 ? -30 : 0}
          textAnchor={data.length > 6 ? 'end' : 'middle'}
          height={data.length > 6 ? 60 : 30}
        />
        <YAxis
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textSecondary, fontFamily: ct.monoFamily }}
          axisLine={false}
          tickLine={false}
          tickFormatter={toAxisYen}
        />
        <Tooltip
          content={createChartTooltip({
            ct,
            formatter: (_value, name, entry) => {
              if (name === 'base') return [null, null]
              const item = entry.payload as WaterfallItem | undefined
              if (!item) return ['-', '-']
              return [fmtCurrency(item.value), item.name]
            },
          })}
        />
        <ReferenceLine y={0} stroke={ct.grid} />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: unknown) => fmt(Number(v))}
            style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
          />
          {data.map((item, idx) => (
            <Cell
              key={idx}
              fill={
                item.isTotal ? colors.total : item.value >= 0 ? colors.positive : colors.negative
              }
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
