/**
 * 売上 vs 仕入原価 日別チャート
 */
import { useMemo, memo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { palette } from '@/presentation/theme/tokens'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import type { PurchaseDailyData } from '@/domain/models/PurchaseComparison'
import { EmptyState, SubNote, ChartWrapper } from './PurchaseAnalysisPage.styles'

// ── データ構築 ──

function buildSalesVsCostData(daily: PurchaseDailyData) {
  const salesMap = new Map(daily.current.map((d) => [d.day, d]))
  const allDays = Array.from(new Set([...daily.current.map((d) => d.day)])).sort((a, b) => a - b)

  const points = allDays.map((day) => {
    const cur = salesMap.get(day)
    return { day, sales: cur?.sales ?? 0, cost: cur?.cost ?? 0 }
  })
  const cumSalesArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.sales)
    return acc
  }, [])
  const cumCostArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.cost)
    return acc
  }, [])

  return points.map((p, i) => ({
    day: `${p.day}日`,
    sales: Math.round(p.sales),
    cost: Math.round(p.cost),
    cumSales: Math.round(cumSalesArr[i]),
    cumCost: Math.round(cumCostArr[i]),
    cumDiff: Math.round(cumSalesArr[i] - cumCostArr[i]),
    costToSalesRatio:
      cumSalesArr[i] > 0 ? Math.round((cumCostArr[i] / cumSalesArr[i]) * 10000) / 100 : 0,
  }))
}

// ── コンポーネント ──

export const PurchaseVsSalesChart = memo(function PurchaseVsSalesChart({
  daily,
}: {
  daily: PurchaseDailyData
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const chartData = useMemo(() => buildSalesVsCostData(daily), [daily])

  if (chartData.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  const fmtYen = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
    return String(v)
  }

  return (
    <>
      <ChartWrapper style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis yAxisId="left" tickFormatter={fmtYen} fontSize={11} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={fmtYen} fontSize={11} />
            <Tooltip formatter={(value) => [fmtCurrency(Number(value)), '']} />
            <Legend />
            <Bar yAxisId="left" dataKey="sales" name="売上" fill={palette.positive} opacity={0.7} />
            <Bar
              yAxisId="left"
              dataKey="cost"
              name="仕入原価"
              fill={palette.negative}
              opacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumDiff"
              name="累計差（売上-仕入）"
              stroke={palette.info}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
      <SubNote style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>
        仕入対売上比率（累計）
      </SubNote>
      <ChartWrapper style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={11} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, '仕入/売上比率']} />
            <Line
              type="monotone"
              dataKey="costToSalesRatio"
              name="仕入/売上比率"
              stroke={palette.warning}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </>
  )
})
