/**
 * DuckDB 前年比較チャート
 *
 * DuckDB の YoY JOIN クエリを使い、当年 vs 前年の日別売上比較を表示する。
 * 月跨ぎクエリに対応しているため、自由な日付範囲で前年比較が可能。
 *
 * 表示モード:
 * - 日次比較: 当年売上線 + 前年売上線（破線）+ 差分棒グラフ
 * - ウォーターフォール: 前年→当年の累積差分を滝グラフで表示
 */
import { useState, useMemo, memo } from 'react'
import {
  ComposedChart,
  BarChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ComparisonFrame, PrevYearScope } from '@/domain/models'
import { useDuckDBYoyDaily, type YoyDailyRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  HeaderRow,
  Title,
  Subtitle,
  TabGroup,
  Tab,
  SummaryRow,
  SummaryItem,
  ErrorMsg,
} from './DuckDBYoYChart.styles'

// ─── Types ────────────────────────────────────────────

type ViewMode = 'line' | 'waterfall'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly frame: ComparisonFrame | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

interface ChartDataPoint {
  readonly date: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly diff: number
}

interface WaterfallItem {
  readonly name: string
  readonly value: number
  readonly base: number
  readonly bar: number
  readonly isTotal?: boolean
}

// ─── Data builders ────────────────────────────────────

function buildChartData(rows: readonly YoyDailyRow[]): ChartDataPoint[] {
  const dailyMap = new Map<string, { curSales: number; prevSales: number; hasPrev: boolean }>()

  for (const row of rows) {
    if (!row.curDateKey) continue
    const existing = dailyMap.get(row.curDateKey) ?? {
      curSales: 0,
      prevSales: 0,
      hasPrev: false,
    }
    existing.curSales += row.curSales
    if (row.prevSales != null) {
      existing.prevSales += row.prevSales
      existing.hasPrev = true
    }
    dailyMap.set(row.curDateKey, existing)
  }

  return [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, d]) => ({
      date: dateKey.slice(5),
      curSales: Math.round(d.curSales),
      prevSales: d.hasPrev ? Math.round(d.prevSales) : null,
      diff: Math.round(d.curSales - d.prevSales),
    }))
}

function buildWaterfallData(chartData: readonly ChartDataPoint[]): WaterfallItem[] {
  const totalPrev = chartData.reduce((s, d) => s + (d.prevSales ?? 0), 0)
  const totalCur = chartData.reduce((s, d) => s + d.curSales, 0)

  const items: WaterfallItem[] = []

  // Start bar: previous year total
  items.push({
    name: '前年計',
    value: totalPrev,
    base: 0,
    bar: totalPrev,
    isTotal: true,
  })

  // Daily diffs as waterfall steps
  let running = totalPrev
  for (const day of chartData) {
    const dayDiff = day.diff
    items.push({
      name: day.date,
      value: dayDiff,
      base: dayDiff >= 0 ? running : running + dayDiff,
      bar: Math.abs(dayDiff),
    })
    running += dayDiff
  }

  // End bar: current year total
  items.push({
    name: '当年計',
    value: totalCur,
    base: 0,
    bar: totalCur,
    isTotal: true,
  })

  return items
}

// ─── Sub-components ───────────────────────────────────

interface LineChartViewProps {
  readonly chartData: readonly ChartDataPoint[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

const LineChartView = memo(function LineChartView({ chartData, ct, fmt }: LineChartViewProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={chartData as ChartDataPoint[]}
        margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
        />
        <YAxis
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          tickFormatter={toAxisYen}
        />
        <Tooltip
          content={createChartTooltip({
            ct,
            formatter: (value: unknown) => [value != null ? fmt(Number(value)) : '-', null],
          })}
        />
        <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

        <Bar dataKey="diff" name="前年差" fill={palette.success} opacity={0.4} barSize={6} />

        <Line
          dataKey="prevSales"
          name="前年売上"
          stroke={palette.slate}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          connectNulls
        />

        <Line
          dataKey="curSales"
          name="当年売上"
          stroke={ct.colors.primary}
          strokeWidth={2}
          dot={{ r: 2, fill: ct.colors.primary }}
        />

        <ReferenceLine y={0} stroke={ct.grid} />
      </ComposedChart>
    </ResponsiveContainer>
  )
})

interface WaterfallViewProps {
  readonly waterfallData: readonly WaterfallItem[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

const WaterfallView = memo(function WaterfallView({ waterfallData, ct, fmt }: WaterfallViewProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={waterfallData as WaterfallItem[]}
        margin={{ top: 20, right: 20, left: 10, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          tickFormatter={toAxisYen}
        />
        <Tooltip
          content={createChartTooltip({
            ct,
            formatter: (value: unknown, name: string) => {
              if (name === 'base') return [null, null]
              return [fmt(Number(value)), '金額']
            },
          })}
        />

        {/* Transparent base for waterfall positioning */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />

        {/* Visible bar */}
        <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: unknown) => {
              const n = Number(v)
              if (n === 0) return ''
              return fmt(n)
            }}
            style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
          />
          {(waterfallData as WaterfallItem[]).map((item, idx) => (
            <Cell
              key={idx}
              fill={item.isTotal ? ct.colors.primary : item.value >= 0 ? sc.positive : sc.negative}
              opacity={item.isTotal ? 0.7 : 0.85}
            />
          ))}
        </Bar>

        <ReferenceLine y={0} stroke={ct.grid} />
      </BarChart>
    </ResponsiveContainer>
  )
})

// ─── Main component ───────────────────────────────────

export const DuckDBYoYChart = memo(function DuckDBYoYChart({
  duckConn,
  duckDataVersion,
  frame,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('line')

  const {
    data: rows,
    isLoading,
    error,
  } = useDuckDBYoyDaily(duckConn, duckDataVersion, frame, selectedStoreIds, prevYearScope)

  const chartData = useMemo(() => (rows ? buildChartData(rows) : []), [rows])
  const waterfallData = useMemo(
    () => (viewMode === 'waterfall' && chartData.length > 0 ? buildWaterfallData(chartData) : []),
    [viewMode, chartData],
  )

  if (error) {
    return (
      <Wrapper aria-label="前年比較（DuckDB）">
        <Title>前年比較（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || !frame || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  // Summary
  const totalCur = chartData.reduce((s, d) => s + d.curSales, 0)
  const totalPrev = chartData.reduce((s, d) => s + (d.prevSales ?? 0), 0)
  const totalDiff = totalCur - totalPrev
  const growthRate = totalPrev > 0 ? toPct(totalDiff / totalPrev, 1) : '-'

  return (
    <Wrapper aria-label="前年比較（DuckDB）">
      <HeaderRow>
        <Title>前年比較（DuckDB）</Title>
        <TabGroup>
          <Tab $active={viewMode === 'line'} onClick={() => setViewMode('line')}>
            日次比較
          </Tab>
          <Tab $active={viewMode === 'waterfall'} onClick={() => setViewMode('waterfall')}>
            ウォーターフォール
          </Tab>
        </TabGroup>
      </HeaderRow>
      <Subtitle>
        {viewMode === 'line'
          ? '当年 vs 前年 日別売上 | 月跨ぎ対応 | 棒 = 前年差'
          : '前年→当年の累積差分 | 青 = 開始/終了 | 水色 = プラス | 橙 = マイナス'}
      </Subtitle>

      {viewMode === 'line' ? (
        <LineChartView chartData={chartData} ct={ct} fmt={fmt} />
      ) : (
        <WaterfallView waterfallData={waterfallData} ct={ct} fmt={fmt} />
      )}

      <SummaryRow>
        <SummaryItem>当年計: {fmt(totalCur)}</SummaryItem>
        <SummaryItem>前年計: {fmt(totalPrev)}</SummaryItem>
        <SummaryItem $accent={totalDiff >= 0 ? sc.positive : sc.negative}>
          差分: {totalDiff >= 0 ? '+' : ''}
          {fmt(totalDiff)} ({growthRate})
        </SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
