import { useState, useMemo, memo } from 'react'
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
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma } from './chartTheme'
import type { CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import {
  queryByDateRange,
  aggregateByLevel,
  countDistinctDays,
  computeDivisor,
} from '@/application/usecases/categoryTimeSales'
import { calculateStdDev } from '@/application/hooks/useStatistics'

const Wrapper = styled.div`
  width: 100%;
  min-height: 440px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)'};
  }
`

const Sep = styled.span`
  opacity: 0.4;
  padding: 3px 2px;
  cursor: default;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text4};
`

const EmptyMsg = styled.div`
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

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

/** 偏差値 = 50 + 10z */
function toDevScore(z: number): number {
  return 50 + 10 * z
}

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  currentDateRange: DateRange
  prevYearDateRange?: DateRange
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
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  currentDateRange,
  prevYearDateRange,
  totalCustomers,
  prevTotalCustomers,
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>('piRank')
  const [level, setLevel] = useState<LevelType>('department')

  const categoryRows = useMemo(() => {
    if (ctsIndex.recordCount === 0 || totalCustomers <= 0) return []

    const records = queryByDateRange(ctsIndex, {
      dateRange: currentDateRange,
      storeIds: selectedStoreIds,
    })
    const dayCount = countDistinctDays(records)
    const divisor = computeDivisor(dayCount, 'total')

    const agg = aggregateByLevel(records, level)

    // Previous year aggregation
    let prevAgg: ReadonlyMap<string, { amount: number; quantity: number }> | null = null
    if (prevYearDateRange && prevCtsIndex.recordCount > 0 && prevTotalCustomers > 0) {
      const prevRecords = queryByDateRange(prevCtsIndex, {
        dateRange: prevYearDateRange,
        storeIds: selectedStoreIds,
      })
      const prevMap = aggregateByLevel(prevRecords, level)
      prevAgg = new Map(
        Array.from(prevMap.entries()).map(([k, v]) => [
          k,
          { amount: v.amount, quantity: v.quantity },
        ]),
      )
    }

    // Build rows
    const rows: CategoryRow[] = []
    const piAmounts: number[] = []
    const piQtys: number[] = []

    for (const [code, entry] of agg) {
      const amount = entry.amount / divisor
      const quantity = entry.quantity / divisor
      const piAmount = (amount / totalCustomers) * 1000
      const piQty = (quantity / totalCustomers) * 1000

      let prevPiAmount: number | null = null
      let prevPiQty: number | null = null
      if (prevAgg && prevTotalCustomers > 0) {
        const prev = prevAgg.get(code)
        if (prev) {
          prevPiAmount = (prev.amount / prevTotalCustomers) * 1000
          prevPiQty = (prev.quantity / prevTotalCustomers) * 1000
        }
      }

      piAmounts.push(piAmount)
      piQtys.push(piQty)

      rows.push({
        code,
        name: entry.name || code,
        amount,
        quantity,
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

    // Sort by piAmount descending
    rows.sort((a, b) => b.piAmount - a.piAmount)

    // Limit to top 20 for readability
    return rows.slice(0, 20)
  }, [
    ctsIndex,
    prevCtsIndex,
    selectedStoreIds,
    currentDateRange,
    prevYearDateRange,
    totalCustomers,
    prevTotalCustomers,
    level,
  ])

  if (ctsIndex.recordCount === 0) {
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
              contentStyle={tooltipStyle(ct)}
              formatter={(value, name) => {
                if (value == null) return ['-', allLabels[name as string] ?? String(name)]
                return [(value as number).toFixed(1), allLabels[name as string] ?? String(name)]
              }}
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
              contentStyle={tooltipStyle(ct)}
              formatter={(value, name) => {
                if (value == null) return ['-', allLabels[name as string] ?? String(name)]
                return [
                  toComma(Math.round(value as number)),
                  allLabels[name as string] ?? String(name),
                ]
              }}
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
