import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { calculateForecast } from '@/domain/calculations/forecast'
import type { ForecastInput, WeeklySummary } from '@/domain/calculations/forecast'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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

const ColorPickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const ColorPickerLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  cursor: pointer;
`

const ColorInput = styled.input`
  width: 28px;
  height: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px;
  cursor: pointer;
  background: transparent;
  &::-webkit-color-swatch-wrapper { padding: 0; }
  &::-webkit-color-swatch { border: none; border-radius: 2px; }
`

const ColorPickerTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const DEFAULT_DOW_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899']

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
    const entry: Record<string, string | number> = { name: `第${w.weekNumber}週` }
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
  const [dowColors, setDowColors] = useState<string[]>([...DEFAULT_DOW_COLORS])

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

  const handleDowColorChange = (index: number, color: string) => {
    setDowColors((prev) => {
      const next = [...prev]
      next[index] = color
      return next
    })
  }

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

      {/* 曜日カラー設定 */}
      <ColorPickerRow>
        <ColorPickerTitle>曜日カラー設定:</ColorPickerTitle>
        {DOW_LABELS.map((label, i) => (
          <ColorPickerLabel key={label}>
            <ColorInput
              type="color"
              value={dowColors[i]}
              onChange={(e) => handleDowColorChange(i, e.target.value)}
            />
            {label}
          </ColorPickerLabel>
        ))}
      </ColorPickerRow>

      <ChartGrid>
        <WeeklyChart data={stackedData} dowColors={dowColors} />
        <DayOfWeekChart averages={forecast.dayOfWeekAverages} dowColors={dowColors} />
      </ChartGrid>

      {/* 店舗間比較チャート */}
      {selectedResults.length > 1 && compareMode && storeForecasts.length > 0 && (
        <ChartGrid>
          <StoreComparisonRadarChart storeForecasts={storeForecasts} />
          <StoreComparisonBarChart storeForecasts={storeForecasts} />
        </ChartGrid>
      )}

      <Section>
        <ModeToggleWrapper>
          <SectionTitle style={{ marginBottom: 0 }}>週別サマリー</SectionTitle>
          {selectedResults.length > 1 && (
            <ChipGroup>
              <Chip $active={!compareMode} onClick={() => setCompareMode(false)}>
                合計モード
              </Chip>
              <Chip $active={compareMode} onClick={() => setCompareMode(true)}>
                比較モード
              </Chip>
            </ChipGroup>
          )}
        </ModeToggleWrapper>

        {!compareMode ? (
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
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>週</Th>
                  <Th>期間</Th>
                  {storeForecasts.map((sf) => (
                    <Th key={`sales-${sf.storeId}`}>{sf.storeName} 売上</Th>
                  ))}
                  {storeForecasts.map((sf) => (
                    <Th key={`gp-${sf.storeId}`}>{sf.storeName} 粗利</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w, wi) => (
                  <Tr key={w.weekNumber}>
                    <Td>第{w.weekNumber}週</Td>
                    <Td>{w.startDay}日〜{w.endDay}日</Td>
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

function WeeklyChart({ data, dowColors }: { data: Record<string, string | number>[]; dowColors: string[] }) {
  const ct = useChartTheme()

  return (
    <ChartWrapper>
      <ChartTitle>週別売上推移（曜日別）</ChartTitle>
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
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          {DOW_LABELS.map((label, i) => (
            <Bar
              key={label}
              dataKey={label}
              stackId="dow"
              fill={dowColors[i]}
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

function DayOfWeekChart({ averages, dowColors }: { averages: readonly import('@/domain/calculations/forecast').DayOfWeekAverage[]; dowColors: string[] }) {
  const ct = useChartTheme()

  const totalAvg = averages.reduce((s, a) => s + a.averageSales, 0)

  const data = averages.map((a, i) => ({
    name: DOW_LABELS[i],
    average: a.averageSales,
    index: safeDivide(a.averageSales, totalAvg, 0),
    count: a.count,
    color: dowColors[i],
  }))

  return (
    <ChartWrapper>
      <ChartTitle>曜日指数（曜日別構成比）</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            width={45}
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
            formatter={(value: number | undefined, name: string | undefined) => {
              if (name === 'index') return [formatPercent(value ?? 0), '曜日指数']
              return [toComma(value ?? 0), '平均売上']
            }}
          />
          <Bar dataKey="index" radius={[4, 4, 0, 0]} maxBarSize={40} label={{
            position: 'top',
            fill: ct.textSecondary,
            fontSize: ct.fontSize.xs,
            fontFamily: ct.monoFamily,
            formatter: (v: unknown) => `${(Number(v) * 100).toFixed(1)}%`,
          }}>
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

/** 店舗間比較レーダーチャート */
function StoreComparisonRadarChart({
  storeForecasts,
}: {
  storeForecasts: { storeId: string; storeName: string; forecast: ReturnType<typeof calculateForecast> }[]
}) {
  const ct = useChartTheme()
  const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  // Build radar data from day-of-week averages
  const radarData = DOW_LABELS.map((label, i) => {
    const entry: Record<string, string | number> = { subject: label }
    storeForecasts.forEach((sf) => {
      entry[sf.storeName] = sf.forecast.dayOfWeekAverages[i]?.averageSales ?? 0
    })
    return entry
  })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 曜日別売上レーダー</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart data={radarData} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
          <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          <PolarRadiusAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            tickFormatter={toManYen}
          />
          {storeForecasts.map((sf, i) => (
            <Radar
              key={sf.storeId}
              name={sf.storeName}
              dataKey={sf.storeName}
              stroke={STORE_COLORS[i % STORE_COLORS.length]}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value: number | undefined) => [toComma(value ?? 0), '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 店舗間比較バーチャート */
function StoreComparisonBarChart({
  storeForecasts,
}: {
  storeForecasts: { storeId: string; storeName: string; forecast: ReturnType<typeof calculateForecast> }[]
}) {
  const ct = useChartTheme()
  const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  // Build grouped bar data per week
  const data = storeForecasts[0]?.forecast.weeklySummaries.map((w, wi) => {
    const entry: Record<string, string | number> = { name: `第${w.weekNumber}週` }
    storeForecasts.forEach((sf) => {
      const sw = sf.forecast.weeklySummaries[wi]
      entry[sf.storeName] = sw?.totalSales ?? 0
    })
    return entry
  }) ?? []

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 週別売上比較</ChartTitle>
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
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {storeForecasts.map((sf, i) => (
            <Bar
              key={sf.storeId}
              dataKey={sf.storeName}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
