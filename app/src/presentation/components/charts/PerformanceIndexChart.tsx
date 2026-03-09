import { useCallback, useState, useMemo, memo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toComma, toPct, toDevScore } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import type { DailyRecord } from '@/domain/models'
import {
  safeDivide,
  calculateTransactionValue,
  calculateMovingAverage,
} from '@/domain/calculations/utils'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import {
  Wrapper,
  HeaderRow,
  Title,
  ViewToggle,
  ViewBtn,
  StatsRow,
  StatChip,
  AnomalyNote,
} from './PerformanceIndexChart.styles'

type ViewType = 'pi' | 'deviation' | 'zScore'

const VIEW_LABELS: Record<ViewType, string> = {
  pi: 'PI値',
  deviation: '偏差値',
  zScore: 'Zスコア',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
  /** 日クリック時コールバック（異常値バーのクリックでナビゲーション） */
  onDayClick?: (day: number) => void
}

export const PerformanceIndexChart = memo(function PerformanceIndexChart({
  daily,
  daysInMonth,
  prevYearDaily,
  onDayClick,
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>('pi')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  const { chartData, stats, piMa7, prevPiMa7 } = useMemo(() => {
    // Phase 1: Collect raw values
    const salesValues: number[] = []
    const customerValues: number[] = []
    const txValues: number[] = []
    const discountRates: number[] = []
    const gpRates: number[] = []
    const piRaw: number[] = []
    const prevPiRaw: number[] = []

    const rawRows: {
      day: number
      sales: number
      customers: number
      txValue: number | null
      discountRate: number
      gpRate: number
      pi: number | null
      prevPi: number | null
    }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const sales = rec?.sales ?? 0
      const grossSales = rec?.grossSales ?? 0
      const customers = rec?.customers ?? 0
      const discount = rec?.discountAbsolute ?? 0
      const cost = rec ? rec.totalCost : 0
      const costInclusion = rec?.costInclusion.cost ?? 0
      const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
      const discountRate = grossSales > 0 ? safeDivide(discount, grossSales, 0) : 0
      const gpRate = sales > 0 ? safeDivide(sales - cost - costInclusion, sales, 0) : 0

      // PI値 = 売上 / 客数 × 1000
      const pi = customers > 0 ? safeDivide(sales, customers, 0) * 1000 : null

      const prev = prevYearDaily?.get(d)
      const prevCustomers = prev?.customers ?? 0
      const prevPi =
        prevCustomers > 0 ? safeDivide(prev?.sales ?? 0, prevCustomers, 0) * 1000 : null

      if (sales > 0) salesValues.push(sales)
      if (customers > 0) customerValues.push(customers)
      if (txValue != null) txValues.push(txValue)
      if (grossSales > 0) discountRates.push(discountRate)
      if (sales > 0) gpRates.push(gpRate)

      piRaw.push(pi ?? 0)
      prevPiRaw.push(prevPi ?? 0)

      rawRows.push({ day: d, sales, customers, txValue, discountRate, gpRate, pi, prevPi })
    }

    // Phase 2: Compute stats for deviation/z-score
    const salesStat = calculateStdDev(salesValues)
    const custStat = calculateStdDev(customerValues)
    const txStat = calculateStdDev(txValues)
    const discStat = calculateStdDev(discountRates)
    const gpStat = calculateStdDev(gpRates)

    // Phase 3: Build chart rows with z-scores and deviation scores
    const rows = rawRows.map((r) => {
      const salesZ =
        salesStat.stdDev > 0 && r.sales > 0 ? (r.sales - salesStat.mean) / salesStat.stdDev : null
      const custZ =
        custStat.stdDev > 0 && r.customers > 0
          ? (r.customers - custStat.mean) / custStat.stdDev
          : null
      const txZ =
        txStat.stdDev > 0 && r.txValue != null ? (r.txValue - txStat.mean) / txStat.stdDev : null
      const discZ =
        discStat.stdDev > 0 && r.sales > 0
          ? (r.discountRate - discStat.mean) / discStat.stdDev
          : null
      const gpZ = gpStat.stdDev > 0 && r.sales > 0 ? (r.gpRate - gpStat.mean) / gpStat.stdDev : null

      return {
        ...r,
        salesZ,
        custZ,
        txZ,
        discZ,
        gpZ,
        salesDev: salesZ != null ? toDevScore(salesZ) : null,
        custDev: custZ != null ? toDevScore(custZ) : null,
        txDev: txZ != null ? toDevScore(txZ) : null,
        discDev: discZ != null ? toDevScore(discZ) : null,
        gpDev: gpZ != null ? toDevScore(gpZ) : null,
      }
    })

    // Moving averages for PI values
    const piMa = calculateMovingAverage(piRaw, 7).map((v) => (isNaN(v) ? null : v))
    const prevPiMa = calculateMovingAverage(prevPiRaw, 7).map((v) => (isNaN(v) ? null : v))

    return {
      chartData: rows,
      stats: { sales: salesStat, cust: custStat, tx: txStat, disc: discStat, gp: gpStat },
      piMa7: piMa,
      prevPiMa7: prevPiMa,
    }
  }, [daily, daysInMonth, prevYearDaily])

  const data = chartData
    .map((d, i) => ({
      ...d,
      piMa7: piMa7[i],
      prevPiMa7: prevPiMa7[i],
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  const hasAnomalies = useMemo(
    () => data.some((d) => d.salesZ != null && Math.abs(d.salesZ) >= 2),
    [data],
  )

  const handleBarClick = useCallback(
    (entry: (typeof data)[number]) => {
      if (onDayClick && entry.salesZ != null && Math.abs(entry.salesZ) >= 2) {
        onDayClick(entry.day)
      }
    },
    [onDayClick],
  )

  const allLabels: Record<string, string> = {
    pi: '金額PI値',
    prevPi: '前年PI値',
    piMa7: 'PI値(7日MA)',
    prevPiMa7: '前年PI値(7日MA)',
    salesDev: '売上',
    custDev: '客数',
    txDev: '客単価',
    discDev: '売変率',
    gpDev: '粗利率',
    salesZ: '売上',
    custZ: '客数',
    txZ: '客単価',
    discZ: '売変率',
    gpZ: '粗利率',
  }

  const titleMap: Record<ViewType, string> = {
    pi: 'PI値分析（金額PI = 売上/客数×1000 / 7日移動平均）',
    deviation: '偏差値分析（各指標の日別偏差値 / 基準=50）',
    zScore: 'Zスコア分析（平均=0からの乖離度 / |Z|≥2 で異常値）',
  }

  return (
    <Wrapper aria-label="業績指数チャート">
      <HeaderRow>
        <Title>
          {titleMap[view]}
          <ChartHelpButton guide={CHART_GUIDES['performance-index']} />
        </Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      </HeaderRow>

      {view === 'deviation' && (
        <StatsRow>
          <StatChip $color={ct.colors.primary}>
            売上 平均:{toComma(stats.sales.mean)} σ:{toComma(stats.sales.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.info}>
            客数 平均:{toComma(stats.cust.mean)} σ:{toComma(stats.cust.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.purple}>
            客単価 平均:{toComma(stats.tx.mean)} σ:{toComma(stats.tx.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.danger}>
            売変率 平均:{toPct(stats.disc.mean)} σ:{toPct(stats.disc.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.success}>
            粗利率 平均:{toPct(stats.gp.mean)} σ:{toPct(stats.gp.stdDev)}
          </StatChip>
        </StatsRow>
      )}

      <ResponsiveContainer
        minWidth={0}
        minHeight={0}
        width="100%"
        height={view === 'deviation' ? '72%' : '80%'}
      >
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />

          {/* PI値 view */}
          {view === 'pi' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => toComma(v)}
                width={55}
              />
              <Bar yAxisId="left" dataKey="pi" maxBarSize={14} radius={[2, 2, 0, 0]} opacity={0.7}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.prevPi != null && entry.pi != null && entry.pi >= entry.prevPi
                        ? ct.colors.primary
                        : ct.colors.slateDark
                    }
                  />
                ))}
              </Bar>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="piMa7"
                stroke={ct.colors.primary}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevPiMa7"
                stroke={ct.colors.slate}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </>
          )}

          {/* 偏差値 view */}
          {view === 'deviation' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                width={35}
                domain={[20, 80]}
              />
              <ReferenceLine
                yAxisId="left"
                y={50}
                stroke={ct.grid}
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
              <ReferenceLine
                yAxisId="left"
                y={60}
                stroke={ct.colors.success}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />
              <ReferenceLine
                yAxisId="left"
                y={40}
                stroke={ct.colors.danger}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="salesDev"
                stroke={ct.colors.primary}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="custDev"
                stroke={ct.colors.info}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="txDev"
                stroke={ct.colors.purple}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gpDev"
                stroke={ct.colors.success}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="discDev"
                stroke={ct.colors.danger}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            </>
          )}

          {/* Zスコア view */}
          {view === 'zScore' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke={ct.grid}
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
              <ReferenceLine
                yAxisId="left"
                y={2}
                stroke={ct.colors.danger}
                strokeDasharray="6 3"
                strokeOpacity={0.4}
                label={{ value: '+2σ', fill: ct.colors.danger, fontSize: 8, position: 'right' }}
              />
              <ReferenceLine
                yAxisId="left"
                y={-2}
                stroke={ct.colors.danger}
                strokeDasharray="6 3"
                strokeOpacity={0.4}
                label={{ value: '-2σ', fill: ct.colors.danger, fontSize: 8, position: 'right' }}
              />
              <Bar
                yAxisId="left"
                dataKey="salesZ"
                maxBarSize={10}
                radius={[2, 2, 0, 0]}
                onClick={(_barData: unknown, index: number) => {
                  const entry = data[index]
                  if (entry) handleBarClick(entry)
                }}
              >
                {data.map((entry, i) => {
                  const z = entry.salesZ ?? 0
                  const isAnomaly = Math.abs(z) >= 2
                  return (
                    <Cell
                      key={i}
                      fill={
                        isAnomaly
                          ? ct.colors.danger
                          : z >= 0
                            ? ct.colors.primary
                            : ct.colors.slateDark
                      }
                      fillOpacity={isAnomaly ? 0.9 : 0.5}
                      cursor={isAnomaly && onDayClick ? 'pointer' : 'default'}
                    />
                  )
                })}
              </Bar>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="custZ"
                stroke={ct.colors.info}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="txZ"
                stroke={ct.colors.purple}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </>
          )}

          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => {
                if (value == null) return ['-', allLabels[name] ?? name]
                const v = value as number
                if (
                  name.includes('pi') ||
                  name.includes('Pi') ||
                  name.includes('Ma7') ||
                  name.includes('prevPi')
                ) {
                  return [toComma(v), allLabels[name] ?? name]
                }
                if (name.includes('Dev') || name.includes('dev'))
                  return [v.toFixed(1), allLabels[name] ?? name]
                if (name.includes('Z') || name.includes('z'))
                  return [v.toFixed(2), allLabels[name] ?? name]
                return [toComma(v), allLabels[name] ?? name]
              },
              labelFormatter: (label) => `${label}日`,
            })}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
          />
        </ComposedChart>
      </ResponsiveContainer>
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
      {view === 'zScore' && hasAnomalies && onDayClick && (
        <AnomalyNote>異常値をクリックすると詳細を表示</AnomalyNote>
      )}
    </Wrapper>
  )
})
