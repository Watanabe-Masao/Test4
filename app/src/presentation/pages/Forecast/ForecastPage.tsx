import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { calculateForecast } from '@/domain/calculations/forecast'
import type { ForecastInput, WeeklySummary } from '@/domain/calculations/forecast'
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
  Legend,
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

const ModeToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const DOW_LABELS = ['\u65e5', '\u6708', '\u706b', '\u6c34', '\u6728', '\u91d1', '\u571f']
const DOW_COLORS = ['#ef4444', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#22c55e']

/** Build a ForecastInput from a StoreResult */
function buildForecastInput(
  r: { daily: ReadonlyMap<number, { sales: number; purchase: { cost: number } }> },
  year: number,
  month: number,
): ForecastInput {
  const dailySales = new Map<number, number>()
  const dailyGrossProfit = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
    const gp = rec.sales - rec.purchase.cost
    dailyGrossProfit.set(d, gp)
  }
  return { year, month, dailySales, dailyGrossProfit }
}

/** Compute stacked bar data: for each week, break down sales by day-of-week */
function computeStackedWeekData(
  weeks: readonly WeeklySummary[],
  dailySales: ReadonlyMap<number, number>,
  year: number,
  month: number,
): Record<string, string | number>[] {
  return weeks.map((w) => {
    const entry: Record<string, string | number> = { name: `\u7b2c${w.weekNumber}\u9031` }
    // Initialize all DOW keys to 0
    for (const label of DOW_LABELS) {
      entry[label] = 0
    }
    // Accumulate sales for each day in this week
    for (let d = w.startDay; d <= w.endDay; d++) {
      const sales = dailySales.get(d) ?? 0
      const dow = new Date(year, month - 1, d).getDay() // 0=Sun
      const label = DOW_LABELS[dow]
      entry[label] = (entry[label] as number) + sales
    }
    return entry
  })
}

export function ForecastPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const [compareMode, setCompareMode] = useState(false)

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="\u4e88\u6e2c\u5206\u6790" storeName={storeName}>
        <EmptyState>\u8a08\u7b97\u3092\u5b9f\u884c\u3057\u3066\u304f\u3060\u3055\u3044</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  // Build forecast input
  const forecastInput = buildForecastInput(r, year, month)
  const forecast = calculateForecast(forecastInput)

  // Find best/worst week
  const activeWeeks = forecast.weeklySummaries.filter((w) => w.totalSales > 0)
  const bestWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales > b.totalSales ? a : b)
    : null
  const worstWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales < b.totalSales ? a : b)
    : null

  // Compute stacked data for weekly chart
  const stackedData = computeStackedWeekData(
    forecast.weeklySummaries,
    forecastInput.dailySales,
    year,
    month,
  )

  // Build per-store forecasts for comparison mode
  const storeForecasts = compareMode
    ? selectedResults.map((sr) => {
        const input = buildForecastInput(sr, year, month)
        const fc = calculateForecast(input)
        const name = stores.get(sr.storeId)?.name ?? sr.storeId
        return { storeId: sr.storeId, storeName: name, forecast: fc }
      })
    : []

  return (
    <MainContent title="\u4e88\u6e2c\u5206\u6790" storeName={storeName}>
      <KpiGrid>
        <KpiCard
          label="\u55b6\u696d\u65e5\u6570"
          value={`${r.salesDays}\u65e5`}
          subText={`\u7d4c\u904e: ${r.elapsedDays}\u65e5`}
          accent="#6366f1"
        />
        <KpiCard
          label="\u65e5\u5e73\u5747\u58f2\u4e0a"
          value={formatCurrency(r.averageDailySales)}
          accent="#22c55e"
        />
        <KpiCard
          label="\u6708\u672b\u4e88\u6e2c\u58f2\u4e0a"
          value={formatCurrency(r.projectedSales)}
          subText={`\u9054\u6210\u7387\u4e88\u6e2c: ${formatPercent(r.projectedAchievement)}`}
          accent="#0ea5e9"
        />
        <KpiCard
          label="\u7570\u5e38\u5024\u691c\u51fa"
          value={`${forecast.anomalies.length}\u4ef6`}
          subText={forecast.anomalies.length > 0 ? `Z-Score > 2.0` : '\u7570\u5e38\u306a\u3057'}
          accent={forecast.anomalies.length > 0 ? '#f59e0b' : '#22c55e'}
        />
      </KpiGrid>

      <ChartGrid>
        <WeeklyChart data={stackedData} />
        <DayOfWeekChart averages={forecast.dayOfWeekAverages} />
      </ChartGrid>

      <Section>
        <ModeToggleWrapper>
          <SectionTitle style={{ marginBottom: 0 }}>\u9031\u5225\u30b5\u30de\u30ea\u30fc</SectionTitle>
          {selectedResults.length > 1 && (
            <ChipGroup>
              <Chip $active={!compareMode} onClick={() => setCompareMode(false)}>
                \u5408\u8a08\u30e2\u30fc\u30c9
              </Chip>
              <Chip $active={compareMode} onClick={() => setCompareMode(true)}>
                \u6bd4\u8f03\u30e2\u30fc\u30c9
              </Chip>
            </ChipGroup>
          )}
        </ModeToggleWrapper>

        {!compareMode ? (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>\u9031</Th>
                  <Th>\u671f\u9593</Th>
                  <Th>\u55b6\u696d\u65e5\u6570</Th>
                  <Th>\u58f2\u4e0a\u5408\u8a08</Th>
                  <Th>\u7c97\u5229\u5408\u8a08</Th>
                  <Th>\u7c97\u5229\u7387</Th>
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w) => (
                  <Tr key={w.weekNumber}>
                    <Td $highlight={w === bestWeek || w === worstWeek}>
                      \u7b2c{w.weekNumber}\u9031
                    </Td>
                    <Td>{w.startDay}\u65e5\u301c{w.endDay}\u65e5</Td>
                    <Td>{w.days}\u65e5</Td>
                    <Td>{formatCurrency(w.totalSales)}</Td>
                    <Td>{formatCurrency(w.totalGrossProfit)}</Td>
                    <Td>{formatPercent(w.grossProfitRate)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>\u9031</Th>
                  <Th>\u671f\u9593</Th>
                  {storeForecasts.map((sf) => (
                    <Th key={`sales-${sf.storeId}`}>{sf.storeName} \u58f2\u4e0a</Th>
                  ))}
                  {storeForecasts.map((sf) => (
                    <Th key={`gp-${sf.storeId}`}>{sf.storeName} \u7c97\u5229</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w, wi) => (
                  <Tr key={w.weekNumber}>
                    <Td>\u7b2c{w.weekNumber}\u9031</Td>
                    <Td>{w.startDay}\u65e5\u301c{w.endDay}\u65e5</Td>
                    {storeForecasts.map((sf) => {
                      const sw = sf.forecast.weeklySummaries[wi]
                      return (
                        <Td key={`sales-${sf.storeId}`}>
                          {sw ? formatCurrency(sw.totalSales) : '-'}
                        </Td>
                      )
                    })}
                    {storeForecasts.map((sf) => {
                      const sw = sf.forecast.weeklySummaries[wi]
                      return (
                        <Td key={`gp-${sf.storeId}`}>
                          {sw ? formatCurrency(sw.totalGrossProfit) : '-'}
                        </Td>
                      )
                    })}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Section>

      {forecast.anomalies.length > 0 && (
        <Section>
          <SectionTitle>\u7570\u5e38\u5024\u691c\u51fa</SectionTitle>
          <Card>
            <CardTitle>\u7d71\u8a08\u7684\u7570\u5e38\u5024\uff08Z-Score &gt; 2.0\uff09</CardTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>\u65e5</Th>
                    <Th>\u58f2\u4e0a</Th>
                    <Th>\u5e73\u5747</Th>
                    <Th>Z-Score</Th>
                    <Th>\u5224\u5b9a</Th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.anomalies.map((a) => (
                    <Tr key={a.day}>
                      <Td>{a.day}\u65e5</Td>
                      <Td>{formatCurrency(a.value)}</Td>
                      <Td>{formatCurrency(a.mean)}</Td>
                      <Td>{a.zScore.toFixed(2)}</Td>
                      <Td>
                        <AnomalyBadge $type={a.zScore > 0 ? 'high' : 'low'}>
                          {a.zScore > 0 ? '\u9ad8\u58f2\u4e0a' : '\u4f4e\u58f2\u4e0a'}
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

function WeeklyChart({ data }: { data: Record<string, string | number>[] }) {
  const ct = useChartTheme()

  return (
    <ChartWrapper>
      <ChartTitle>\u9031\u5225\u58f2\u4e0a\u63a8\u79fb\uff08\u66dc\u65e5\u5225\uff09</ChartTitle>
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
            formatter={(value: number, name: string) => [toComma(value), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          {DOW_LABELS.map((label, i) => (
            <Bar
              key={label}
              dataKey={label}
              stackId="dow"
              fill={DOW_COLORS[i]}
              fillOpacity={0.8}
              radius={i === DOW_LABELS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
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
      <ChartTitle>\u66dc\u65e5\u5225\u5e73\u5747\u58f2\u4e0a</ChartTitle>
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
            formatter={(value) => [toComma(value as number), '\u5e73\u5747\u58f2\u4e0a']}
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
