import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { calculateForecast } from '@/domain/calculations/forecast'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { useChartTheme, toManYen, toComma } from '@/presentation/components/charts/chartTheme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import styled from 'styled-components'

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const ChartWrapper = styled.div`
  width: 100%;
  height: 320px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const Th = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: center; }
`

const Td = styled.td<{ $highlight?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $highlight, theme }) => $highlight ? theme.colors.palette.warning : theme.colors.text};
  font-weight: ${({ $highlight, theme }) => $highlight ? theme.typography.fontWeight.bold : 'normal'};
  &:first-child { text-align: center; color: ${({ theme }) => theme.colors.text2}; }
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const AnomalyBadge = styled.span<{ $type: 'high' | 'low' }>`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $type, theme }) =>
    $type === 'high' ? `${theme.colors.palette.success}20` : `${theme.colors.palette.danger}20`};
  color: ${({ $type, theme }) =>
    $type === 'high' ? theme.colors.palette.success : theme.colors.palette.danger};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const DOW_COLORS = ['#ef4444', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#22c55e']

export function ForecastPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="予測分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  // Build forecast input
  const dailySales = new Map<number, number>()
  const dailyGrossProfit = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
    const gp = rec.sales - rec.purchase.cost
    dailyGrossProfit.set(d, gp)
  }

  const forecast = calculateForecast({ year, month, dailySales, dailyGrossProfit })

  // Find best/worst week
  const activeWeeks = forecast.weeklySummaries.filter((w) => w.totalSales > 0)
  const bestWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales > b.totalSales ? a : b)
    : null
  const worstWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales < b.totalSales ? a : b)
    : null

  return (
    <MainContent title="予測分析" storeName={storeName}>
      <KpiGrid>
        <KpiCard
          label="営業日数"
          value={`${r.salesDays}日`}
          subText={`経過: ${r.elapsedDays}日`}
          accent="#6366f1"
        />
        <KpiCard
          label="日平均売上"
          value={formatCurrency(r.averageDailySales)}
          accent="#22c55e"
        />
        <KpiCard
          label="月末予測売上"
          value={formatCurrency(r.projectedSales)}
          subText={`達成率予測: ${formatPercent(r.projectedAchievement)}`}
          accent="#0ea5e9"
        />
        <KpiCard
          label="異常値検出"
          value={`${forecast.anomalies.length}件`}
          subText={forecast.anomalies.length > 0 ? `Z-Score > 2.0` : '異常なし'}
          accent={forecast.anomalies.length > 0 ? '#f59e0b' : '#22c55e'}
        />
      </KpiGrid>

      <ChartGrid>
        <WeeklyChart weeks={forecast.weeklySummaries} />
        <DayOfWeekChart averages={forecast.dayOfWeekAverages} />
      </ChartGrid>

      <Section>
        <SectionTitle>週別サマリー</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>週</Th>
                <Th>期間</Th>
                <Th>営業日数</Th>
                <Th>売上合計</Th>
                <Th>粗利合計</Th>
                <Th>粗利率</Th>
              </tr>
            </thead>
            <tbody>
              {forecast.weeklySummaries.map((w) => (
                <Tr key={w.weekNumber}>
                  <Td $highlight={w === bestWeek || w === worstWeek}>
                    第{w.weekNumber}週
                  </Td>
                  <Td>{w.startDay}日〜{w.endDay}日</Td>
                  <Td>{w.days}日</Td>
                  <Td>{formatCurrency(w.totalSales)}</Td>
                  <Td>{formatCurrency(w.totalGrossProfit)}</Td>
                  <Td>{formatPercent(w.grossProfitRate)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </Section>

      {forecast.anomalies.length > 0 && (
        <Section>
          <SectionTitle>異常値検出</SectionTitle>
          <Card>
            <CardTitle>統計的異常値（Z-Score &gt; 2.0）</CardTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>日</Th>
                    <Th>売上</Th>
                    <Th>平均</Th>
                    <Th>Z-Score</Th>
                    <Th>判定</Th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.anomalies.map((a) => (
                    <Tr key={a.day}>
                      <Td>{a.day}日</Td>
                      <Td>{formatCurrency(a.value)}</Td>
                      <Td>{formatCurrency(a.mean)}</Td>
                      <Td>{a.zScore.toFixed(2)}</Td>
                      <Td>
                        <AnomalyBadge $type={a.zScore > 0 ? 'high' : 'low'}>
                          {a.zScore > 0 ? '高売上' : '低売上'}
                        </AnomalyBadge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Card>
        </Section>
      )}
    </MainContent>
  )
}

function WeeklyChart({ weeks }: { weeks: readonly import('@/domain/calculations/forecast').WeeklySummary[] }) {
  const ct = useChartTheme()

  const data = weeks.map((w) => ({
    name: `第${w.weekNumber}週`,
    sales: w.totalSales,
    profit: w.totalGrossProfit,
  }))

  return (
    <ChartWrapper>
      <ChartTitle>週別売上推移</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value) => [toComma(value as number), '売上']}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={ct.colors.primary}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

function DayOfWeekChart({ averages }: { averages: readonly import('@/domain/calculations/forecast').DayOfWeekAverage[] }) {
  const ct = useChartTheme()

  const data = averages.map((a, i) => ({
    name: DOW_LABELS[i],
    average: a.averageSales,
    count: a.count,
    color: DOW_COLORS[i],
  }))

  return (
    <ChartWrapper>
      <ChartTitle>曜日別平均売上</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value) => [toComma(value as number), '平均売上']}
          />
          <Bar dataKey="average" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
