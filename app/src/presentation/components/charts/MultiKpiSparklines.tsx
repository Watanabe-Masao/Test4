import { useMemo, memo } from 'react'
import { AreaChart, Area, YAxis, ReferenceLine } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toComma, toPct } from './chartTheme'
import type { DailyRecord } from '@/domain/models'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import {
  Wrapper,
  HeaderRow,
  Title,
  SparkRow,
  MetricLabel,
  SparkContainer,
  CurrentValue,
  Badge,
} from './MultiKpiSparklines.styles'

interface MetricDef {
  key: string
  label: string
  color: string
  format: (v: number) => string
  /** For rates, badge shows absolute diff; for amounts, badge shows % change */
  isRate?: boolean
  /** Higher is worse (e.g., discount rate, cost rate) */
  invertSign?: boolean
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
}

export const MultiKpiSparklines = memo(function MultiKpiSparklines({
  daily,
  daysInMonth,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()

  const metrics: MetricDef[] = useMemo(
    () => [
      { key: 'sales', label: '売上', color: ct.colors.primary, format: (v: number) => toComma(v) },
      {
        key: 'gpRate',
        label: '粗利率',
        color: ct.colors.success,
        format: (v: number) => toPct(v),
        isRate: true,
      },
      {
        key: 'discountRate',
        label: '売変率',
        color: ct.colors.danger,
        format: (v: number) => toPct(v),
        isRate: true,
        invertSign: true,
      },
      {
        key: 'customers',
        label: '客数',
        color: ct.colors.info,
        format: (v: number) => `${toComma(v)}人`,
      },
      {
        key: 'txValue',
        label: '客単価',
        color: ct.colors.purple,
        format: (v: number) => `${toComma(v)}円`,
      },
      {
        key: 'costRate',
        label: '原価率',
        color: ct.colors.orange,
        format: (v: number) => toPct(v),
        isRate: true,
        invertSign: true,
      },
    ],
    [ct],
  )

  const { sparkData, summaries } = useMemo(() => {
    const rows: Record<string, number | null>[] = []
    const prevRows: Record<string, number | null>[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const sales = rec?.sales ?? 0
      const grossSales = rec?.grossSales ?? 0
      const cost = rec ? rec.totalCost : 0
      const costInclusion = rec?.costInclusion.cost ?? 0
      const discount = rec?.discountAbsolute ?? 0
      const customers = rec?.customers ?? 0
      const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
      const gpRate = sales > 0 ? safeDivide(sales - cost - costInclusion, sales, 0) : null
      const discountRate = grossSales > 0 ? safeDivide(discount, grossSales, 0) : null
      const costRate = sales > 0 ? safeDivide(cost, sales, 0) : null

      rows.push({
        day: d,
        sales,
        gpRate,
        discountRate,
        customers: customers || null,
        txValue,
        costRate,
      })

      const prev = prevYearDaily?.get(d)
      if (prev) {
        const pSales = prev.sales
        const pCustomers = prev.customers ?? 0
        const pTxValue = pCustomers > 0 ? calculateTransactionValue(pSales, pCustomers) : null
        prevRows.push({ day: d, sales: pSales, customers: pCustomers || null, txValue: pTxValue })
      }
    }

    // Compute summaries (latest non-null value, average, prev year aggregate)
    const sums: Record<string, { current: number; prev: number | null; change: number | null }> = {}
    for (const m of metrics) {
      const vals = rows.map((r) => r[m.key]).filter((v): v is number => v != null)
      const currentAvg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0

      let prevAvg: number | null = null
      if (
        prevRows.length > 0 &&
        (m.key === 'sales' || m.key === 'customers' || m.key === 'txValue')
      ) {
        const pVals = prevRows.map((r) => r[m.key]).filter((v): v is number => v != null)
        prevAvg = pVals.length > 0 ? pVals.reduce((a, b) => a + b, 0) / pVals.length : null
      }

      const change =
        prevAvg != null && prevAvg > 0
          ? m.isRate
            ? currentAvg - prevAvg
            : safeDivide(currentAvg - prevAvg, prevAvg, 0)
          : null

      sums[m.key] = { current: currentAvg, prev: prevAvg, change }
    }

    return { sparkData: rows, summaries: sums }
  }, [daily, daysInMonth, prevYearDaily, metrics])

  return (
    <Wrapper>
      <HeaderRow>
        <Title>マルチKPIダッシュボード（日別推移を一覧比較）</Title>
      </HeaderRow>
      {metrics.map((m) => {
        const summary = summaries[m.key]
        const dataForSpark = sparkData.map((row) => ({
          day: row.day,
          value: row[m.key] ?? undefined,
        }))

        return (
          <SparkRow key={m.key}>
            <MetricLabel>{m.label}</MetricLabel>
            <SparkContainer>
              <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                <AreaChart data={dataForSpark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`spark-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={m.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={m.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  {m.isRate && (
                    <ReferenceLine
                      y={summary?.current ?? 0}
                      stroke={m.color}
                      strokeDasharray="2 2"
                      strokeOpacity={0.3}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={m.color}
                    strokeWidth={1.5}
                    fill={`url(#spark-${m.key})`}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </SparkContainer>
            <CurrentValue>{summary ? m.format(summary.current) : '-'}</CurrentValue>
            {summary?.change != null ? (
              <Badge $positive={m.invertSign ? summary.change <= 0 : summary.change >= 0}>
                {m.isRate
                  ? `${summary.change >= 0 ? '+' : ''}${toPct(summary.change)}t`
                  : `${summary.change >= 0 ? '+' : ''}${toPct(summary.change)}`}
              </Badge>
            ) : (
              <Badge $positive={true} style={{ opacity: 0.3 }}>
                -
              </Badge>
            )}
          </SparkRow>
        )
      })}
    </Wrapper>
  )
})
