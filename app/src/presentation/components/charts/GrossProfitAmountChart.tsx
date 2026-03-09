import { useState, memo } from 'react'
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { Wrapper, HeaderRow, Title, TabGroup, Tab } from './GrossProfitAmountChart.styles'
import { useChartTheme, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import type { DailyRecord } from '@/domain/models'
import { safeDivide } from '@/domain/calculations/utils'

type GpView = 'amountRate' | 'rateOnly'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  grossProfitBudget: number
  targetRate: number
  warningRate?: number
  /** 前年の日次データ（粗利率の前年比較用） */
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
  /** 前年の仕入コストマップ（日→仕入原価）。省略時は前年粗利率ラインを表示しない */
  prevYearCostMap?: ReadonlyMap<number, number>
}

/** 粗利推移チャート（額+率 / 率のみ 切替） */
export const GrossProfitAmountChart = memo(function GrossProfitAmountChart({
  daily,
  daysInMonth,
  grossProfitBudget,
  targetRate,
  warningRate,
  prevYearDaily,
  prevYearCostMap,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [gpView, setGpView] = useState<GpView>('amountRate')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  let cumSales = 0
  let cumCost = 0

  // 前年粗利率ラインの計算（prevYearDaily + prevYearCostMap が両方ある場合のみ）
  let prevCumSales = 0
  let prevCumCost = 0
  const hasPrevGp = !!prevYearDaily && !!prevYearCostMap

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += rec.totalCost
    }
    const grossProfit = cumSales - cumCost
    const rate = safeDivide(grossProfit, cumSales, 0)

    let prevRate: number | null = null
    if (hasPrevGp) {
      const prevSales = prevYearDaily!.get(d)?.sales ?? 0
      const prevCostVal = prevYearCostMap!.get(d) ?? 0
      prevCumSales += prevSales
      prevCumCost += prevCostVal
      prevRate = prevCumSales > 0 ? safeDivide(prevCumSales - prevCumCost, prevCumSales, 0) : null
    }

    allData.push({
      day: d,
      grossProfit,
      rate,
      prevRate,
      hasSales: rec ? rec.sales > 0 : false,
    })
  }

  const data = allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  const titleText =
    gpView === 'rateOnly'
      ? '粗利率推移（累計ベース）'
      : '粗利額累計推移（バー: 粗利額 / ライン: 粗利率）'

  // 率のみビュー用: Y軸上限
  const maxRate = Math.max(...data.filter((d) => d.hasSales).map((d) => d.rate), 0)
  const yMax = Math.max(0.5, Math.ceil(maxRate * 10) / 10)

  const getBarColor = (rate: number) => {
    if (rate >= targetRate) return ct.colors.success
    if (warningRate != null && rate >= warningRate) return ct.colors.warning
    return ct.colors.danger
  }

  return (
    <Wrapper aria-label="粗利額チャート">
      <HeaderRow>
        <Title>{titleText}</Title>
        <TabGroup>
          <Tab $active={gpView === 'amountRate'} onClick={() => setGpView('amountRate')}>
            額+率
          </Tab>
          <Tab $active={gpView === 'rateOnly'} onClick={() => setGpView('rateOnly')}>
            率のみ
          </Tab>
        </TabGroup>
      </HeaderRow>

      {gpView === 'amountRate' ? (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
          <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.85} />
                <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
              width={55}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => toPct(v, 0)}
              width={40}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value: unknown, name: string) => {
                  if (name === 'rate') return [toPct(value as number), '粗利率']
                  if (name === 'prevRate')
                    return [value != null ? toPct(value as number) : '-', '前年粗利率']
                  return [toComma(value as number), '粗利額累計']
                },
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  grossProfit: '粗利額累計',
                  rate: '粗利率',
                  prevRate: '前年粗利率',
                }
                return labels[value] ?? value
              }}
            />
            {grossProfitBudget > 0 && (
              <ReferenceLine
                yAxisId="left"
                y={grossProfitBudget}
                stroke={ct.colors.warning}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `粗利予算 ${fmt(grossProfitBudget)}`,
                  position: 'right',
                  fill: ct.colors.warning,
                  fontSize: ct.fontSize.xs,
                  fontFamily: ct.monoFamily,
                }}
              />
            )}
            {targetRate > 0 && (
              <ReferenceLine
                yAxisId="right"
                y={targetRate}
                stroke={ct.colors.info}
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{
                  value: `目標 ${toPct(targetRate)}`,
                  position: 'left',
                  fill: ct.colors.info,
                  fontSize: ct.fontSize.xs,
                  fontFamily: ct.monoFamily,
                }}
              />
            )}
            <Bar
              yAxisId="left"
              dataKey="grossProfit"
              fill="url(#gpGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rate"
              stroke={ct.colors.primary}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasPrevGp && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prevRate"
                stroke={ct.colors.slate}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => toPct(v, 0)}
              width={40}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value: unknown) => [toPct(value as number), '粗利率'],
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <ReferenceLine
              y={targetRate}
              stroke={ct.colors.success}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `目標 ${toPct(targetRate)}`,
                position: 'right',
                fill: ct.colors.success,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
            {warningRate != null && warningRate > 0 && (
              <ReferenceLine
                y={warningRate}
                stroke={ct.colors.warning}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `警告 ${toPct(warningRate)}`,
                  position: 'right',
                  fill: ct.colors.warning,
                  fontSize: ct.fontSize.xs,
                  fontFamily: ct.monoFamily,
                }}
              />
            )}
            <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={16}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.hasSales ? getBarColor(entry.rate) : 'transparent'}
                  fillOpacity={entry.hasSales ? 0.8 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
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
