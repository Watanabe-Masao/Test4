/**
 * DuckDB 部門KPI月別トレンドチャート
 *
 * DuckDB に格納された複数月の department_kpi データから
 * 部門別の粗利率・売上実績の月次推移を表示する。
 *
 * マルチ月データロードが有効な場合、IndexedDB に保存された
 * 全月分の部門KPIを横断的に比較できる。
 *
 * 表示項目:
 * - 粗利率（実績）折れ線グラフ
 * - 売上実績棒グラフ
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  useDuckDBDeptKpiTrend,
  type DeptKpiMonthlyTrendRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, STORE_COLORS } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'

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

const DeptSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const DeptChip = styled.button<{ $active: boolean }>`
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

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly loadedMonthCount: number
  readonly year: number
  readonly month: number
}

interface MonthChartPoint {
  readonly label: string
  readonly [deptKey: string]: string | number | null
}

/**
 * トレンドデータをチャートデータに変換
 *
 * 行: 月 (label: "YYYY/MM")
 * 列: 部門ごとの粗利率 (gpRate_DeptCode) と売上 (sales_DeptCode)
 */
function buildChartData(
  rows: readonly DeptKpiMonthlyTrendRow[],
  selectedDept: string | null,
): {
  chartData: MonthChartPoint[]
  deptNames: Map<string, string>
} {
  const deptNames = new Map<string, string>()
  const monthMap = new Map<string, Record<string, number | null>>()

  for (const row of rows) {
    deptNames.set(row.deptCode, row.deptName)
    const key = `${row.year}/${String(row.month).padStart(2, '0')}`
    const existing = monthMap.get(key) ?? {}

    if (!selectedDept || selectedDept === row.deptCode) {
      existing[`gpRate_${row.deptCode}`] = Math.round(row.gpRateActual * 10000) / 100
      existing[`sales_${row.deptCode}`] = Math.round(row.salesActual)
    }

    monthMap.set(key, existing)
  }

  const sortedKeys = [...monthMap.keys()].sort()
  const chartData: MonthChartPoint[] = sortedKeys.map((label) => ({
    label,
    ...monthMap.get(label)!,
  }))

  return { chartData, deptNames }
}

export const DuckDBDeptTrendChart = memo(function DuckDBDeptTrendChart({
  duckConn,
  duckDataVersion,
  loadedMonthCount,
  year,
  month,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  // 過去12ヶ月分の yearMonth を構築
  const yearMonths = useMemo(() => {
    const months: { year: number; month: number }[] = []
    for (let i = 11; i >= 0; i--) {
      let m = month - i
      let y = year
      while (m <= 0) {
        m += 12
        y -= 1
      }
      months.push({ year: y, month: m })
    }
    return months
  }, [year, month])

  const {
    data: trendData,
    isLoading,
    error,
  } = useDuckDBDeptKpiTrend(duckConn, duckDataVersion, yearMonths)

  const { chartData, deptNames } = useMemo(
    () =>
      trendData
        ? buildChartData(trendData, selectedDept)
        : { chartData: [], deptNames: new Map<string, string>() },
    [trendData, selectedDept],
  )

  const handleDeptClick = useCallback((deptCode: string) => {
    setSelectedDept((prev) => (prev === deptCode ? null : deptCode))
  }, [])

  if (error) {
    return (
      <Wrapper aria-label="部門別KPIトレンド（DuckDB）">
        <Title>部門別KPIトレンド（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !trendData) {
    return <ChartSkeleton />
  }

  // DuckDB未準備、またはマルチ月データが2ヶ月未満の場合は非表示
  if (!duckConn || duckDataVersion === 0 || loadedMonthCount < 2 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const deptEntries = [...deptNames.entries()]
  const visibleDepts = selectedDept
    ? deptEntries.filter(([code]) => code === selectedDept)
    : deptEntries

  return (
    <Wrapper aria-label="部門別KPIトレンド（DuckDB）">
      <Title>部門別KPIトレンド（DuckDB）</Title>
      <Subtitle>
        粗利率（線）・売上実績（棒）の月次推移 | {loadedMonthCount}ヶ月分ロード済み
      </Subtitle>

      {deptEntries.length > 1 && (
        <DeptSelector>
          <DeptChip $active={selectedDept === null} onClick={() => setSelectedDept(null)}>
            全部門
          </DeptChip>
          {deptEntries.map(([code, name]) => (
            <DeptChip
              key={code}
              $active={selectedDept === code}
              onClick={() => handleDeptClick(code)}
            >
              {name}
            </DeptChip>
          ))}
        </DeptSelector>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            yAxisId="sales"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => fmt(v)}
          />
          <YAxis
            yAxisId="gpRate"
            orientation="right"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name?: string) => {
              if (value == null) return ['-']
              if (name?.includes('粗利率')) return [`${value}%`]
              return [fmt(value)]
            }}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {visibleDepts.map(([code, name], i) => (
            <Bar
              key={`sales_${code}`}
              yAxisId="sales"
              dataKey={`sales_${code}`}
              name={`${name} 売上`}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              opacity={0.4}
              barSize={8}
            />
          ))}
          {visibleDepts.map(([code, name], i) => (
            <Line
              key={`gpRate_${code}`}
              yAxisId="gpRate"
              dataKey={`gpRate_${code}`}
              name={`${name} 粗利率`}
              stroke={STORE_COLORS[i % STORE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: STORE_COLORS[i % STORE_COLORS.length] }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
})
