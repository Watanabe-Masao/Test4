/**
 * 部門別時間帯パターンチャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → DeptHourlyChartLogic.ts → ECharts option → EChart
 *
 * @migration P5: useQueryWithHandler 経由に移行済み（旧: useDuckDBCategoryHourly 直接 import）
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'
import { useCurrencyFormatter } from './chartTheme'
import { buildDeptHourlyData, detectCannibalization, TOP_N_OPTIONS } from './DeptHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis } from './builders'
import {
  TopNSelector,
  TopNSelect,
  ChipContainer,
  DeptChip,
  ColorDot,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  InsightBar,
  InsightItem,
  InsightTitle,
} from './DeptHourlyChart.styles'

type ViewMode = 'stacked' | 'separate'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'stacked', label: '積み上げ' },
  { value: 'separate', label: '独立' },
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(
  chartData: readonly { hour: string; [k: string]: string | number }[],
  departments: readonly { code: string; name: string; color: string }[],
  viewMode: ViewMode,
  theme: AppTheme,
): EChartsOption {
  const hours = chartData.map((d) => d.hour)
  return {
    grid: standardGrid(),
    tooltip: standardTooltip(theme),
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(hours, theme),
    yAxis: yenYAxis(theme),
    series: [...departments].reverse().map((dept) => ({
      name: dept.name,
      type: 'line' as const,
      stack: viewMode === 'stacked' ? 'depts' : undefined,
      areaStyle: { opacity: viewMode === 'stacked' ? 0.4 : 0.15 },
      data: chartData.map((d) => (d[`dept_${dept.code}`] as number) ?? 0),
      lineStyle: { color: dept.color, width: viewMode === 'stacked' ? 1.5 : 2 },
      itemStyle: { color: dept.color },
      symbol: 'none',
      smooth: true,
    })),
  }
}

export const DeptHourlyChart = React.memo(function DeptHourlyChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')

  const input = useMemo<CategoryHourlyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'department' as const,
    }
  }, [currentDateRange, selectedStoreIds])

  const {
    data: output,
    error,
    isLoading,
  } = useQueryWithHandler(queryExecutor, categoryHourlyHandler, input)

  const categoryHourlyRows = output?.records ?? null

  const { chartData, departments, hourlyPatterns } = useMemo(
    () =>
      categoryHourlyRows
        ? buildDeptHourlyData(categoryHourlyRows, topN, activeDepts, HOUR_MIN, HOUR_MAX)
        : { chartData: [], departments: [], hourlyPatterns: new Map<string, number[]>() },
    [categoryHourlyRows, topN, activeDepts],
  )

  const cannibalization = useMemo(
    () => detectCannibalization(departments, hourlyPatterns),
    [departments, hourlyPatterns],
  )

  const option = useMemo(
    () => buildOption(chartData, departments, viewMode, theme),
    [chartData, departments, viewMode, theme],
  )

  const handleTopNChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopN(Number(e.target.value))
    setActiveDepts(new Set())
  }, [])

  const handleChipClick = useCallback((code: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  if (error) {
    return (
      <ChartCard title="部門別時間帯パターン">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !categoryHourlyRows) {
    return (
      <ChartCard title="部門別時間帯パターン">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!queryExecutor || chartData.length === 0) {
    return (
      <ChartCard title="部門別時間帯パターン">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const subtitle = `上位${topN}部門の時間帯別売上 | ${viewMode === 'stacked' ? '積み上げ面グラフ' : '独立面グラフ'}`
  const toolbar = (
    <>
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={viewMode}
        onChange={setViewMode}
        ariaLabel="表示モード"
      />
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
    </>
  )

  return (
    <ChartCard title="部門別時間帯パターン" subtitle={subtitle} toolbar={toolbar}>
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

      <EChart option={option} height={300} ariaLabel="部門別時間帯パターンチャート" />

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
    </ChartCard>
  )
})
