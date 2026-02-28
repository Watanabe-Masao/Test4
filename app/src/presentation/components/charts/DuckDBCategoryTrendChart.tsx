/**
 * DuckDB カテゴリ別日次売上推移チャート
 *
 * DuckDB のカテゴリ別日次トレンドクエリを使い、上位Nカテゴリの
 * 日次売上推移をマルチライン折れ線グラフで表示する。
 *
 * 表示項目:
 * - カテゴリ別日次売上の折れ線（上位N）
 * - 階層レベル切替（部門/ライン/クラス）
 * - TopN件数切替（5/8/10）
 */
import { useMemo, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryDailyTrend,
  type CategoryDailyTrendRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const ChipGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const ChipLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  flex-wrap: wrap;
`

const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Constants ──

/** カテゴリ区別用の色配列（最大10色） */
const CATEGORY_COLORS = [
  palette.primary,
  palette.successDark,
  palette.warningDark,
  palette.dangerDark,
  palette.cyanDark,
  palette.pinkDark,
  palette.purpleDark,
  palette.orangeDark,
  palette.blueDark,
  palette.limeDark,
] as const

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

const TOP_N_OPTIONS = [5, 8, 10] as const

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly date: string
  readonly [categoryKey: string]: string | number | null
}

interface CategoryInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
}

// ── Data transformation ──

function buildChartData(rows: readonly CategoryDailyTrendRow[]): {
  chartData: ChartDataPoint[]
  categories: CategoryInfo[]
} {
  // Collect unique categories with total amounts
  const categoryTotals = new Map<string, { name: string; total: number }>()
  for (const row of rows) {
    const existing = categoryTotals.get(row.code) ?? { name: row.name, total: 0 }
    existing.total += row.amount
    categoryTotals.set(row.code, existing)
  }

  // Sort categories by total amount descending
  const categories: CategoryInfo[] = [...categoryTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      totalAmount: Math.round(info.total),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  // Build chart data: one row per date, one column per category
  const dateMap = new Map<string, Record<string, number>>()
  for (const row of rows) {
    const dateKey = row.dateKey.slice(5) // MM-DD
    const existing = dateMap.get(dateKey) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(row.amount)
    dateMap.set(dateKey, existing)
  }

  const sortedDates = [...dateMap.keys()].sort()
  const chartData: ChartDataPoint[] = sortedDates.map((date) => ({
    date,
    ...dateMap.get(date)!,
  }))

  return { chartData, categories }
}

// ── Component ──

export function DuckDBCategoryTrendChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [topN, setTopN] = useState<number>(8)

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const handleTopNChange = useCallback((n: number) => {
    setTopN(n)
  }, [])

  const { data: trendRows, error } = useDuckDBCategoryDailyTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    undefined,
    topN,
  )

  const { chartData, categories } = useMemo(
    () => (trendRows ? buildChartData(trendRows) : { chartData: [], categories: [] }),
    [trendRows],
  )

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ別売上推移（DuckDB）">
        <Title>カテゴリ別売上推移（DuckDB）</Title>
        <ErrorMsg>データの取得に失敗しました: {error}</ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
  }

  // Find top category (highest total)
  const topCategory = categories[0]

  return (
    <Wrapper aria-label="カテゴリ別売上推移（DuckDB）">
      <Title>カテゴリ別売上推移（DuckDB）</Title>
      <Subtitle>上位{topN}カテゴリの日次売上トレンド | 月跨ぎ対応</Subtitle>

      <ControlRow>
        <ChipGroup>
          <ChipLabel>階層:</ChipLabel>
          {(Object.keys(LEVEL_LABELS) as HierarchyLevel[]).map((l) => (
            <Chip key={l} $active={level === l} onClick={() => handleLevelChange(l)}>
              {LEVEL_LABELS[l]}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          {TOP_N_OPTIONS.map((n) => (
            <Chip key={n} $active={topN === n} onClick={() => handleTopNChange(n)}>
              {n}件
            </Chip>
          ))}
        </ChipGroup>
      </ControlRow>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name?: string) => {
              if (value == null) return ['-']
              const cat = categories.find((c) => c.code === name)
              const label = cat ? cat.name : (name ?? '')
              return [fmt(value), label]
            }}
            labelFormatter={(label: unknown) => `日付: ${String(label)}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.6rem' }}
            formatter={(value: string) => {
              const cat = categories.find((c) => c.code === value)
              return cat ? cat.name : value
            }}
          />

          {categories.map((cat, i) => (
            <Line
              key={cat.code}
              dataKey={cat.code}
              name={cat.code}
              stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              dot={{ r: i === 0 ? 3 : 1.5, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <SummaryRow>
        {topCategory && (
          <SummaryItem>
            最大: {topCategory.name} ({fmt(topCategory.totalAmount)})
          </SummaryItem>
        )}
        <SummaryItem>対象日数: {chartData.length}日</SummaryItem>
        <SummaryItem>カテゴリ数: {categories.length}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
}
