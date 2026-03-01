import { useMemo } from 'react'
import { AreaChart, Area, YAxis, ReferenceLine } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, toComma, toPct } from './chartTheme'
import type { DailyRecord } from '@/domain/models'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const SparkRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 90px 60px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}40;
  &:last-child {
    border-bottom: none;
  }
`

const MetricLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SparkContainer = styled.div`
  height: 32px;
  width: 100%;
  position: relative;
`

const CurrentValue = styled.div`
  font-size: 0.7rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  white-space: nowrap;
`

const Badge = styled.div<{ $positive: boolean }>`
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: 1px 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  text-align: center;
  white-space: nowrap;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.palette.success : theme.colors.palette.danger};
  background: ${({ $positive, theme }) =>
    $positive
      ? theme.mode === 'dark'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(34,197,94,0.08)'
      : theme.mode === 'dark'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(239,68,68,0.08)'};
`

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

export function MultiKpiSparklines({ daily, daysInMonth, prevYearDaily }: Props) {
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
      const consumable = rec?.consumable.cost ?? 0
      const discount = rec?.discountAbsolute ?? 0
      const customers = rec?.customers ?? 0
      const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
      const gpRate = sales > 0 ? safeDivide(sales - cost - consumable, sales, 0) : null
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
}
