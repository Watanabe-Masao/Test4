/**
 * カテゴリ別日次売上推移チャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → CategoryTrendChartLogic.ts → ECharts option → EChart
 *
 * ECharts の組み込み legend toggle でカテゴリ除外/復帰を実現。
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBCategoryDailyTrend } from '@/application/hooks/useDuckDBQuery'
import { buildCategoryTrendData, type CategoryInfo } from './CategoryTrendChartLogic'
import { useCurrencyFormatter } from './chartTheme'
import { DowPresetSelector } from './DowPresetSelector'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryRow,
  SummaryItem,
  BreadcrumbBar,
  BreadcrumbItem,
  BreadcrumbSep,
} from './CategoryTrendChart.styles'

type HierarchyLevel = 'department' | 'line' | 'klass'

const TOP_N_OPTIONS = [5, 8, 10] as const

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const TOP_N_SEGMENT_OPTIONS: readonly { value: string; label: string }[] = TOP_N_OPTIONS.map(
  (n) => ({ value: String(n), label: `${n}件` }),
)

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  /** サブパネル埋め込み時に曜日セレクタを非表示にする */
  readonly hideDowSelector?: boolean
  /** サブパネル埋め込み時に ChartCard ラッパーを省略する */
  readonly embedded?: boolean
}

interface DrillState {
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

function buildOption(
  chartData: readonly { date: string; [k: string]: string | number | null }[],
  categories: readonly CategoryInfo[],
  theme: AppTheme,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  const colors = theme.chart.series

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; color: string }[]
        if (!Array.isArray(items)) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">日付: ${(items[0] as unknown as { name: string })?.name ?? ''}</div>`
        const rows = items
          .filter((item) => item.value != null)
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="color:${item.color}">${item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace">${toCommaYen(item.value!)}</span></div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: {
      ...standardLegend(theme),
      type: 'scroll',
      selectedMode: true, // ECharts 組み込み legend toggle
    },
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: categories.map((cat, i) => ({
      name: cat.name,
      type: 'line' as const,
      data: chartData.map((d) => (d[cat.code] as number) ?? null),
      lineStyle: { color: colors[i % colors.length], width: i === 0 ? 2.5 : 1.5 },
      itemStyle: { color: colors[i % colors.length] },
      symbolSize: i === 0 ? 6 : 3,
      connectNulls: true,
    })),
  }
}

export const CategoryTrendChart = memo(function CategoryTrendChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  hideDowSelector,
  embedded,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [topN, setTopN] = useState<number>(8)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const [drill, setDrill] = useState<DrillState>({})

  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])
  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
    setDrill({})
  }, [])

  const handleBreadcrumbClick = useCallback((targetLevel: 'root' | 'department') => {
    if (targetLevel === 'root') {
      setDrill({})
      setLevel('department')
    } else {
      setDrill((prev) => ({ deptCode: prev.deptCode, deptName: prev.deptName }))
      setLevel('line')
    }
  }, [])

  const hierarchy = useMemo(
    () =>
      drill.deptCode || drill.lineCode
        ? { deptCode: drill.deptCode, lineCode: drill.lineCode }
        : undefined,
    [drill.deptCode, drill.lineCode],
  )

  const dowParam = useMemo(
    () => (selectedDows.length > 0 ? selectedDows : undefined),
    [selectedDows],
  )

  const {
    data: trendRows,
    error,
    isLoading,
  } = useDuckDBCategoryDailyTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    hierarchy,
    topN,
    dowParam,
  )

  // ECharts の legend toggle で除外を管理するため、excludedCodes は不要に
  const emptyExcluded = useMemo(() => new Set<string>(), [])
  const { chartData, categories } = useMemo(
    () =>
      trendRows
        ? buildCategoryTrendData(trendRows, emptyExcluded)
        : { chartData: [], categories: [] },
    [trendRows, emptyExcluded],
  )

  const option = useMemo(
    () => buildOption(chartData, categories, theme),
    [chartData, categories, theme],
  )

  // ECharts クリックでドリルダウン
  const canDrill = level !== 'klass'
  const handleChartClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!canDrill) return
      const seriesName = params.seriesName as string
      const cat = categories.find((c) => c.name === seriesName)
      if (!cat) return
      if (level === 'department') {
        setDrill({ deptCode: cat.code, deptName: cat.name })
        setLevel('line')
      } else if (level === 'line') {
        setDrill((prev) => ({ ...prev, lineCode: cat.code, lineName: cat.name }))
        setLevel('klass')
      }
    },
    [canDrill, categories, level],
  )

  if (error) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !trendRows) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const hasDrill = drill.deptCode != null
  const topCategory = categories[0]
  const subtitle = `上位${topN}カテゴリの日次売上トレンド | 月跨ぎ対応${selectedDows.length > 0 ? ' | 曜日フィルタ適用中' : ''}`

  const content = (
    <>
      {hasDrill && (
        <BreadcrumbBar>
          <BreadcrumbItem $active={false} onClick={() => handleBreadcrumbClick('root')}>
            全体
          </BreadcrumbItem>
          <BreadcrumbSep>▸</BreadcrumbSep>
          {drill.deptCode && (
            <>
              <BreadcrumbItem
                $active={level === 'line' && !drill.lineCode}
                onClick={() => handleBreadcrumbClick('department')}
              >
                {drill.deptName ?? drill.deptCode}
              </BreadcrumbItem>
              {drill.lineCode && (
                <>
                  <BreadcrumbSep>▸</BreadcrumbSep>
                  <BreadcrumbItem $active onClick={() => {}}>
                    {drill.lineName ?? drill.lineCode}
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbBar>
      )}

      <ControlRow>
        {!hasDrill && (
          <ChipGroup>
            <ChipLabel>階層:</ChipLabel>
            <SegmentedControl
              options={LEVEL_SEGMENT_OPTIONS}
              value={level}
              onChange={handleLevelChange}
              ariaLabel="階層レベル"
            />
          </ChipGroup>
        )}
        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          <SegmentedControl
            options={TOP_N_SEGMENT_OPTIONS}
            value={String(topN)}
            onChange={(v) => setTopN(Number(v))}
            ariaLabel="表示件数"
          />
        </ChipGroup>
        {!hideDowSelector && (
          <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
        )}
      </ControlRow>

      <EChart
        option={option}
        height={320}
        onClick={handleChartClick}
        ariaLabel="カテゴリ別売上推移チャート"
      />

      <SummaryRow>
        {topCategory && (
          <SummaryItem>
            最大: {topCategory.name} ({fmt(topCategory.totalAmount)})
          </SummaryItem>
        )}
        <SummaryItem>対象日数: {chartData.length}日</SummaryItem>
        <SummaryItem>カテゴリ数: {categories.length}</SummaryItem>
        {canDrill && <SummaryItem>ドリルダウン: チャート上のカテゴリをクリック</SummaryItem>}
      </SummaryRow>
    </>
  )

  if (embedded) return content

  return (
    <ChartCard title="カテゴリ別売上推移" subtitle={subtitle}>
      {content}
    </ChartCard>
  )
})
