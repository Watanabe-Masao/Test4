/**
 * カテゴリPI値・偏差値分析 — DuckDB 版
 *
 * DuckDB の queryLevelAggregation で階層別集約データを取得し、
 * PI値（金額PI / 点数PI）と偏差値を算出して横棒チャートで表示する。
 */
import { useState, useMemo, memo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
  ComposedChart,
  Line,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toComma, toDevScore } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import type { DateRange } from '@/domain/models'
import { useDuckDBLevelAggregation } from '@/application/hooks/duckdb'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  HeaderRow,
  Title,
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  EmptyMsg,
} from './CategoryPerformanceChart.styles'

type ViewType = 'piRank' | 'deviation' | 'piQtyRank'
type LevelType = 'department' | 'line' | 'klass'

const VIEW_LABELS: Record<ViewType, string> = {
  piRank: '金額PI値',
  piQtyRank: '点数PI値',
  deviation: '偏差値',
}

const LEVEL_LABELS: Record<LevelType, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

interface Props {
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  currentDateRange: DateRange
  prevYearDateRange?: DateRange
  selectedStoreIds: ReadonlySet<string>
  totalCustomers: number
  prevTotalCustomers: number
}

interface CategoryRow {
  code: string
  name: string
  amount: number
  quantity: number
  piAmount: number
  piQty: number
  prevPiAmount: number | null
  prevPiQty: number | null
  deviation: number | null
  qtyDeviation: number | null
}

export const CategoryPerformanceChart = memo(function CategoryPerformanceChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  prevYearDateRange,
  selectedStoreIds,
  totalCustomers,
  prevTotalCustomers,
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>('piRank')
  const [level, setLevel] = useState<LevelType>('department')

  // DuckDB: 当年レベル別集約
  const curAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  // DuckDB: 前年レベル別集約
  const prevAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    prevYearDateRange,
    selectedStoreIds,
    level,
    undefined,
    true, // isPrevYear
  )

  const categoryRows = useMemo(() => {
    if (!curAgg.data || curAgg.data.length === 0 || totalCustomers <= 0) return []

    const prevMap = new Map<string, { amount: number; quantity: number }>()
    if (prevAgg.data && prevTotalCustomers > 0) {
      for (const row of prevAgg.data) {
        prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
      }
    }

    const rows: CategoryRow[] = []
    const piAmounts: number[] = []
    const piQtys: number[] = []

    for (const entry of curAgg.data) {
      const piAmount = (entry.amount / totalCustomers) * 1000
      const piQty = (entry.quantity / totalCustomers) * 1000

      let prevPiAmount: number | null = null
      let prevPiQty: number | null = null
      if (prevTotalCustomers > 0) {
        const prev = prevMap.get(entry.code)
        if (prev) {
          prevPiAmount = (prev.amount / prevTotalCustomers) * 1000
          prevPiQty = (prev.quantity / prevTotalCustomers) * 1000
        }
      }

      piAmounts.push(piAmount)
      piQtys.push(piQty)

      rows.push({
        code: entry.code,
        name: entry.name || entry.code,
        amount: entry.amount,
        quantity: entry.quantity,
        piAmount,
        piQty,
        prevPiAmount,
        prevPiQty,
        deviation: null,
        qtyDeviation: null,
      })
    }

    // Compute deviation scores
    const amtStat = calculateStdDev(piAmounts)
    const qtyStat = calculateStdDev(piQtys)

    for (const row of rows) {
      if (amtStat.stdDev > 0) {
        row.deviation = toDevScore((row.piAmount - amtStat.mean) / amtStat.stdDev)
      }
      if (qtyStat.stdDev > 0) {
        row.qtyDeviation = toDevScore((row.piQty - qtyStat.mean) / qtyStat.stdDev)
      }
    }

    // Sort by piAmount descending, limit to top 20
    rows.sort((a, b) => b.piAmount - a.piAmount)
    return rows.slice(0, 20)
  }, [curAgg.data, prevAgg.data, totalCustomers, prevTotalCustomers])

  // Loading state
  if (curAgg.isLoading) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <ChartSkeleton height="360px" />
      </Wrapper>
    )
  }

  if (!curAgg.data || curAgg.data.length === 0) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <EmptyMsg>分類別時間帯売上データがありません</EmptyMsg>
      </Wrapper>
    )
  }

  if (totalCustomers <= 0) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <EmptyMsg>客数データがありません（PI値の算出に客数が必要です）</EmptyMsg>
      </Wrapper>
    )
  }

  const allLabels: Record<string, string> = {
    piAmount: '金額PI値',
    prevPiAmount: '前年金額PI値',
    piQty: '点数PI値',
    prevPiQty: '前年点数PI値',
    deviation: '金額PI偏差値',
    qtyDeviation: '点数PI偏差値',
  }

  const chartHeight = Math.max(300, categoryRows.length * 28 + 40)

  const titleMap: Record<ViewType, string> = {
    piRank: `金額PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 売上÷客数×1000）`,
    piQtyRank: `点数PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 点数÷客数×1000）`,
    deviation: `カテゴリ偏差値分析（${LEVEL_LABELS[level]}別 / 基準=50）`,
  }

  return (
    <Wrapper aria-label="カテゴリ実績チャート">
      <HeaderRow>
        <Title>{titleMap[view]}</Title>
        <ToggleRow>
          <ViewToggle>
            {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
              <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ViewBtn>
            ))}
          </ViewToggle>
          <Sep>|</Sep>
          <ViewToggle>
            {(Object.keys(LEVEL_LABELS) as LevelType[]).map((l) => (
              <ViewBtn key={l} $active={level === l} onClick={() => setLevel(l)}>
                {LEVEL_LABELS[l]}
              </ViewBtn>
            ))}
          </ViewToggle>
        </ToggleRow>
      </HeaderRow>

      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={chartHeight}>
        {view === 'deviation' ? (
          <ComposedChart
            data={categoryRows}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={ct.grid}
              strokeOpacity={0.3}
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[20, 80]}
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: ct.textMuted, fontSize: 8, fontFamily: ct.fontFamily }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={50} stroke={ct.grid} strokeWidth={1.5} strokeOpacity={0.7} />
            <ReferenceLine
              x={60}
              stroke={ct.colors.success}
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />
            <ReferenceLine
              x={40}
              stroke={ct.colors.danger}
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />
            <Bar dataKey="deviation" barSize={10} radius={[0, 3, 3, 0]}>
              {categoryRows.map((entry, i) => {
                const d = entry.deviation ?? 50
                return (
                  <Cell
                    key={i}
                    fill={
                      d >= 60
                        ? ct.colors.success
                        : d >= 50
                          ? ct.colors.primary
                          : d >= 40
                            ? ct.colors.warning
                            : ct.colors.danger
                    }
                    fillOpacity={0.7}
                  />
                )
              })}
            </Bar>
            <Line
              type="monotone"
              dataKey="qtyDeviation"
              stroke={ct.colors.purple}
              strokeWidth={2}
              dot={{ fill: ct.colors.purple, r: 3 }}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  if (value == null) return ['-', allLabels[name] ?? name]
                  return [(value as number).toFixed(1), allLabels[name] ?? name]
                },
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => allLabels[value] ?? value}
            />
          </ComposedChart>
        ) : (
          <BarChart
            data={categoryRows}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={ct.grid}
              strokeOpacity={0.3}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: ct.textMuted, fontSize: 8, fontFamily: ct.fontFamily }}
              axisLine={false}
              tickLine={false}
            />
            {view === 'piRank' && (
              <>
                <Bar dataKey="piAmount" barSize={10} radius={[0, 3, 3, 0]}>
                  {categoryRows.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.prevPiAmount != null && entry.piAmount >= entry.prevPiAmount
                          ? ct.colors.primary
                          : ct.colors.slateDark
                      }
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="prevPiAmount"
                  barSize={6}
                  fill={ct.colors.slate}
                  fillOpacity={0.35}
                  radius={[0, 2, 2, 0]}
                />
              </>
            )}
            {view === 'piQtyRank' && (
              <>
                <Bar dataKey="piQty" barSize={10} radius={[0, 3, 3, 0]}>
                  {categoryRows.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.prevPiQty != null && entry.piQty >= entry.prevPiQty
                          ? ct.colors.info
                          : ct.colors.slateDark
                      }
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="prevPiQty"
                  barSize={6}
                  fill={ct.colors.slate}
                  fillOpacity={0.35}
                  radius={[0, 2, 2, 0]}
                />
              </>
            )}
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  if (value == null) return ['-', allLabels[name] ?? name]
                  return [toComma(Math.round(value as number)), allLabels[name] ?? name]
                },
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => allLabels[value] ?? value}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Wrapper>
  )
})
