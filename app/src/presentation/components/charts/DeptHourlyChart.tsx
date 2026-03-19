/**
 * 部門別時間帯パターンチャート
 *
 * CategoryHourly クエリを使い、上位N部門の時間帯別売上を
 * 積み上げ面グラフまたは独立面グラフで表示する。
 *
 * 表示項目:
 * - 上位N部門の時間帯別売上（積み上げ / 独立 面グラフ）
 * - 部門チップ（色凡例兼フィルタ）
 * - 上位N件セレクタ
 * - ピアソン相関によるカニバリゼーション検出
 */
import React, { useState, useMemo, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBCategoryHourly } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import {
  buildDeptHourlyData,
  detectCannibalization,
  TOP_N_OPTIONS,
} from './DeptHourlyChartLogic'
import { createChartTooltip } from './createChartTooltip'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  HeaderRow,
  Controls,
  TopNSelector,
  TopNSelect,
  TabGroup,
  Tab,
  ChipContainer,
  DeptChip,
  ColorDot,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  InsightBar,
  InsightItem,
  InsightTitle,
  ErrorMsg,
} from './DeptHourlyChart.styles'

// ── Types ──

type ViewMode = 'stacked' | 'separate'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

// ── Component ──

export const DeptHourlyChart = React.memo(function DeptHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')

  // 部門レベルで時間帯別集約
  const {
    data: categoryHourlyRows,
    error,
    isLoading,
  } = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
  )

  const { chartData, departments, hourlyPatterns } = useMemo(
    () =>
      categoryHourlyRows
        ? buildDeptHourlyData(categoryHourlyRows, topN, activeDepts, HOUR_MIN, HOUR_MAX)
        : { chartData: [], departments: [], hourlyPatterns: new Map<string, number[]>() },
    [categoryHourlyRows, topN, activeDepts],
  )

  // ピアソン相関によるカニバリゼーション検出
  const cannibalization = useMemo(
    () => detectCannibalization(departments, hourlyPatterns),
    [departments, hourlyPatterns],
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
      <Wrapper aria-label="部門別時間帯パターン">
        <Title>部門別時間帯パターン</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !categoryHourlyRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="部門別時間帯パターン">
      <HeaderRow>
        <div>
          <Title>部門別時間帯パターン</Title>
          <Subtitle>
            上位{topN}部門の時間帯別売上 |{' '}
            {viewMode === 'stacked' ? '積み上げ面グラフ' : '独立面グラフ'}
          </Subtitle>
        </div>
        <Controls>
          <TabGroup>
            <Tab $active={viewMode === 'stacked'} onClick={() => setViewMode('stacked')}>
              積み上げ
            </Tab>
            <Tab $active={viewMode === 'separate'} onClick={() => setViewMode('separate')}>
              独立
            </Tab>
          </TabGroup>
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
        </Controls>
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
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => [value != null ? fmt(value as number) : '-', name ?? ''],
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 下位から描画（積み上げ順） */}
          {[...departments].reverse().map((dept) => (
            <Area
              key={`dept_${dept.code}`}
              type="monotone"
              dataKey={`dept_${dept.code}`}
              name={dept.name}
              stackId={viewMode === 'stacked' ? 'depts' : undefined}
              fill={dept.color}
              fillOpacity={viewMode === 'stacked' ? 0.4 : 0.15}
              stroke={dept.color}
              strokeWidth={viewMode === 'stacked' ? 1.5 : 2}
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

      {cannibalization.length > 0 && (
        <InsightBar>
          <InsightTitle>時間帯カニバリゼーション検出（相関分析）</InsightTitle>
          {cannibalization.map((c, i) => (
            <InsightItem key={i}>
              {c.deptA} × {c.deptB}: 相関r={c.r.toFixed(2)}（負の相関 → 同時間帯で競合の可能性）
            </InsightItem>
          ))}
        </InsightBar>
      )}
    </Wrapper>
  )
})
