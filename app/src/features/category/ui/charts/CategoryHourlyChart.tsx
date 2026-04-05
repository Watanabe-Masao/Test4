/**
 * カテゴリ×時間帯分析チャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → CategoryHourlyChartLogic.ts → ECharts heatmap option → EChart
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBCategoryHourly 直接 import）
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useCategoryHourlyChartPlan,
  type CategoryHourlyInput,
} from '@/features/category'
import { HOUR_MIN, HOUR_MAX } from '@/presentation/components/charts/HeatmapChart.helpers'
import { buildCategoryHeatmapData } from '@/features/category/ui/charts/CategoryHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from '@/presentation/components/charts/ChartState'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { chartFontSize } from '@/presentation/theme/tokens'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryRow,
  SummaryItem,
} from '@/features/category/ui/charts/CategoryHourlyChart.styles'

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const HOURS = Array.from({ length: HOUR_MAX - HOUR_MIN + 1 }, (_, i) => i + HOUR_MIN)

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(
  categories: readonly {
    code: string
    name: string
    hourlyAmounts: ReadonlyMap<number, number>
    peakHour: number
  }[],
  maxAmount: number,
  theme: AppTheme,
): EChartsOption {
  const catNames = categories.map((c) => c.name)
  const hourLabels = HOURS.map((h) => `${h}時`)

  // ECharts heatmap data: [hourIdx, catIdx, value]
  const heatmapData: [number, number, number][] = []
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci]
    for (let hi = 0; hi < HOURS.length; hi++) {
      const amount = cat.hourlyAmounts.get(HOURS[hi]) ?? 0
      heatmapData.push([hi, ci, Math.round(amount)])
    }
  }

  return {
    grid: { ...standardGrid(), left: 100, right: 60, top: 10, bottom: 40, containLabel: false },
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number]; name: string }
        const [hi, ci, val] = p.value
        const catName = catNames[ci] ?? ''
        const hour = HOURS[hi] ?? 0
        return `${catName} ${hour}時<br/>${toCommaYen(val)}`
      },
    },
    xAxis: {
      type: 'category',
      data: hourLabels,
      splitArea: { show: true },
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
    },
    yAxis: {
      type: 'category',
      data: catNames,
      axisLabel: {
        color: theme.colors.text2,
        fontSize: chartFontSize.axis,
        width: 90,
        overflow: 'truncate',
      },
    },
    visualMap: {
      min: 0,
      max: maxAmount > 0 ? maxAmount : 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: [theme.mode === 'dark' ? theme.colors.bg3 : '#f1f5f9', theme.colors.palette.primary],
      },
      textStyle: { color: theme.colors.text3, fontSize: chartFontSize.annotation },
      show: false,
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: unknown) => {
            const val = (params as { value: [number, number, number] }).value[2]
            return val > 0 ? toCommaYen(val) : ''
          },
          fontSize: chartFontSize.annotation,
          color: theme.colors.text3,
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  }
}

export const CategoryHourlyChart = memo(function CategoryHourlyChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const input = useMemo<CategoryHourlyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
    }
  }, [currentDateRange, selectedStoreIds, level])

  const { data: output, error, isLoading } = useCategoryHourlyChartPlan(queryExecutor, input)

  const hourlyRows = output?.records ?? null

  const heatmapData = useMemo(
    () =>
      hourlyRows
        ? buildCategoryHeatmapData(hourlyRows, HOUR_MIN)
        : { categories: [], maxAmount: 0, globalPeakHour: HOUR_MIN },
    [hourlyRows],
  )

  const option = useMemo(
    () => buildOption(heatmapData.categories, heatmapData.maxAmount, theme),
    [heatmapData, theme],
  )

  const chartHeight = Math.max(200, heatmapData.categories.length * 30 + 60)

  if (error) {
    return (
      <ChartCard title="カテゴリ×時間帯分析">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !hourlyRows) {
    return (
      <ChartCard title="カテゴリ×時間帯分析">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!queryExecutor || heatmapData.categories.length === 0) {
    return (
      <ChartCard title="カテゴリ×時間帯分析">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="カテゴリ×時間帯分析" subtitle="カテゴリ別の時間帯売上分布 | ★ = ピーク">
      <ControlRow>
        <ChipGroup>
          <ChipLabel>階層:</ChipLabel>
          <SegmentedControl
            options={LEVEL_SEGMENT_OPTIONS}
            value={level}
            onChange={handleLevelChange}
            ariaLabel="階層レベル"
          />
        </ChipGroup>
      </ControlRow>

      <EChart option={option} height={chartHeight} ariaLabel="カテゴリ×時間帯ヒートマップ" />

      <SummaryRow>
        <SummaryItem>全体ピーク: {heatmapData.globalPeakHour}時</SummaryItem>
        <SummaryItem>表示カテゴリ: {heatmapData.categories.length}件</SummaryItem>
        {heatmapData.categories[0] && (
          <SummaryItem>
            最大: {heatmapData.categories[0].name} (ピーク {heatmapData.categories[0].peakHour}時)
          </SummaryItem>
        )}
      </SummaryRow>
    </ChartCard>
  )
})
