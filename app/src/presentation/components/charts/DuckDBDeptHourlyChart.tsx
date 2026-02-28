/**
 * DuckDB 部門別時間帯パターンチャート
 *
 * DuckDB の CategoryHourly クエリを使い、上位N部門の時間帯別売上を
 * 積み上げ面グラフで表示する。部門チップによる可視化制御が可能。
 *
 * 表示項目:
 * - 上位N部門の時間帯別売上（積み上げ面グラフ）
 * - 部門チップ（色凡例兼フィルタ）
 * - 上位N件セレクタ
 */
import { useState, useMemo, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBCategoryHourly, type CategoryHourlyRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, STORE_COLORS } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'

// ── Styled Components ──

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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const TopNSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
`

const TopNSelect = styled.select`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
`

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const DeptChip = styled.button<{ $color: string; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid ${({ $active, $color, theme }) => ($active ? $color : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, $color }) => ($active ? `${$color}18` : 'transparent')};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;
  opacity: ${({ $active }) => ($active ? 1 : 0.6)};

  &:hover {
    border-color: ${({ $color }) => $color};
    opacity: 1;
  }
`

const ColorDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
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

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface DeptInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly color: string
}

interface ChartDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly [deptKey: string]: string | number
}

// ── Constants ──

const HOUR_MIN = 6
const HOUR_MAX = 22

const TOP_N_OPTIONS = [3, 5, 7, 10] as const

/** 部門別カラーパレット（STORE_COLORS を拡張） */
const DEPT_COLORS = [
  ...STORE_COLORS,
  palette.purple,
  palette.orange,
  palette.lime,
  palette.blue,
  palette.pink,
] as const

// ── Helpers ──

/**
 * CategoryHourly行データから上位N部門を抽出し、チャートデータを構築する
 */
function buildChartData(
  rows: readonly CategoryHourlyRow[],
  topN: number,
  activeDepts: ReadonlySet<string>,
): {
  chartData: ChartDataPoint[]
  departments: DeptInfo[]
} {
  // 部門別の合計額を集計してランキング
  const deptTotals = new Map<string, { name: string; total: number }>()
  for (const row of rows) {
    const existing = deptTotals.get(row.code) ?? { name: row.name, total: 0 }
    existing.total += row.amount
    deptTotals.set(row.code, existing)
  }

  // 合計額順にソートして上位N件を取得
  const sorted = [...deptTotals.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, topN)

  const departments: DeptInfo[] = sorted.map(([code, info], i) => ({
    code,
    name: info.name || code,
    totalAmount: Math.round(info.total),
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))

  const topCodes = new Set(departments.map((d) => d.code))

  // 時間帯×部門のマトリクスを構築
  const hourMap = new Map<number, Record<string, number>>()
  for (const row of rows) {
    if (!topCodes.has(row.code)) continue
    if (row.hour < HOUR_MIN || row.hour > HOUR_MAX) continue

    const existing = hourMap.get(row.hour) ?? {}
    const key = `dept_${row.code}`
    existing[key] = (existing[key] ?? 0) + row.amount
    hourMap.set(row.hour, existing)
  }

  // チャートデータ構築（全時間帯を網羅）
  const chartData: ChartDataPoint[] = []
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    const hourData = hourMap.get(h) ?? {}
    const point: Record<string, string | number> = {
      hour: `${h}時`,
      hourNum: h,
    }

    for (const dept of departments) {
      const key = `dept_${dept.code}`
      // activeDepts が空（全表示）または含まれている場合のみ値を設定
      if (activeDepts.size === 0 || activeDepts.has(dept.code)) {
        point[key] = Math.round(hourData[key] ?? 0)
      } else {
        point[key] = 0
      }
    }

    chartData.push(point as ChartDataPoint)
  }

  return { chartData, departments }
}

// ── Component ──

export function DuckDBDeptHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())

  // 部門レベルで時間帯別集約
  const { data: categoryHourlyRows, error } = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
  )

  const { chartData, departments } = useMemo(
    () =>
      categoryHourlyRows
        ? buildChartData(categoryHourlyRows, topN, activeDepts)
        : { chartData: [], departments: [] },
    [categoryHourlyRows, topN, activeDepts],
  )

  const handleTopNChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopN(Number(e.target.value))
    setActiveDepts(new Set())
  }, [])

  const handleChipClick = useCallback((code: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  if (error) {
    return (
      <Wrapper aria-label="部門別時間帯パターン（DuckDB）">
        <Title>部門別時間帯パターン（DuckDB）</Title>
        <ErrorMsg>データの取得に失敗しました: {error}</ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
  }

  return (
    <Wrapper aria-label="部門別時間帯パターン（DuckDB）">
      <HeaderRow>
        <div>
          <Title>部門別時間帯パターン（DuckDB）</Title>
          <Subtitle>上位{topN}部門の時間帯別売上 | 積み上げ面グラフ</Subtitle>
        </div>
        <TopNSelector>
          <span>上位</span>
          <TopNSelect value={topN} onChange={handleTopNChange}>
            {TOP_N_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}部門
              </option>
            ))}
          </TopNSelect>
        </TopNSelector>
      </HeaderRow>

      <ChipContainer>
        {departments.map((dept) => (
          <DeptChip
            key={dept.code}
            $color={dept.color}
            $active={activeDepts.size === 0 || activeDepts.has(dept.code)}
            onClick={() => handleChipClick(dept.code)}
          >
            <ColorDot $color={dept.color} />
            {dept.name}
          </DeptChip>
        ))}
      </ChipContainer>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
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
            formatter={(value: number | undefined, name?: string) => [
              value != null ? fmt(value) : '-',
              name ?? '',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 下位から描画（積み上げ順） */}
          {[...departments].reverse().map((dept) => (
            <Area
              key={`dept_${dept.code}`}
              type="monotone"
              dataKey={`dept_${dept.code}`}
              name={dept.name}
              stackId="depts"
              fill={dept.color}
              fillOpacity={0.4}
              stroke={dept.color}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <SummaryRow>
        {departments.slice(0, 5).map((dept) => (
          <SummaryItem key={dept.code}>
            <SummaryLabel>{dept.name}:</SummaryLabel>
            {fmt(dept.totalAmount)}
          </SummaryItem>
        ))}
      </SummaryRow>
    </Wrapper>
  )
}
