/**
 * カテゴリ別日次売上推移チャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → CategoryTrendChartLogic.ts → ECharts option → EChart
 *
 * ECharts の組み込み legend toggle でカテゴリ除外/復帰を実現。
 *
 * @migration P5: useQueryWithHandler 経由に移行済み（旧: useDuckDBCategoryDailyTrend 直接 import）
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryDailyTrendHandler,
  type CategoryDailyTrendInput,
} from '@/application/queries/cts/CategoryDailyTrendHandler'
import {
  buildCategoryTrendData,
  buildPrevYearTrendData,
  type CategoryInfo,
  type TrendMetric,
} from './CategoryTrendChartLogic'
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
  YoYToggle,
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

const METRIC_OPTIONS: readonly { value: TrendMetric; label: string }[] = [
  { value: 'amount', label: '金額' },
  { value: 'quantity', label: '点数' },
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  /** 前年スコープ（ヘッダの比較設定から取得） */
  readonly prevYearScope?: PrevYearScope
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

/** 前年シリーズ名のサフィックス */
const PREV_YEAR_SUFFIX = '(前年)'

function toCommaNum(val: number): string {
  return val.toLocaleString() + '点'
}

function buildOption(
  chartData: readonly { date: string; [k: string]: string | number | null }[],
  categories: readonly CategoryInfo[],
  theme: AppTheme,
  prevYearData?: ReadonlyMap<string, Record<string, number>>,
  isQuantity?: boolean,
  prevYearLabel?: string,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  const colors = theme.chart.series
  const hasPrev = prevYearData != null && prevYearData.size > 0
  const fmtValue = isQuantity ? toCommaNum : toCommaYen

  // 当年シリーズ
  const curSeries = categories.map((cat, i) => ({
    name: cat.name,
    type: 'line' as const,
    data: chartData.map((d) => (d[cat.code] as number) ?? null),
    lineStyle: { color: colors[i % colors.length], width: i === 0 ? 2.5 : 1.5 },
    itemStyle: { color: colors[i % colors.length] },
    symbolSize: i === 0 ? 6 : 3,
    connectNulls: true,
  }))

  // 前年シリーズ（破線・半透明）
  const prevSeries = hasPrev
    ? categories.map((cat, i) => ({
        name: `${cat.name}${PREV_YEAR_SUFFIX}`,
        type: 'line' as const,
        data: dates.map((date) => {
          const dayData = prevYearData.get(date)
          return dayData?.[cat.code] ?? null
        }),
        lineStyle: {
          color: colors[i % colors.length],
          width: 1,
          type: 'dashed' as const,
          opacity: 0.5,
        },
        itemStyle: { color: colors[i % colors.length], opacity: 0.5 },
        symbolSize: 0,
        connectNulls: true,
      }))
    : []

  // カテゴリ名→前年値の高速引きマップ構築（ツールチップ用）
  const prevNameToValue = hasPrev
    ? (dateName: string) => {
        const dayData = prevYearData.get(dateName)
        if (!dayData) return undefined
        const result = new Map<string, number>()
        for (const cat of categories) {
          if (dayData[cat.code] != null) result.set(cat.name, dayData[cat.code])
        }
        return result
      }
    : undefined

  const yAxis = isQuantity
    ? {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text4,
          formatter: (v: number) => v.toLocaleString(),
        },
        splitLine: { lineStyle: { color: theme.colors.border } },
        name: '点数',
        nameTextStyle: { color: theme.colors.text4 },
      }
    : yenYAxis(theme)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; color: string }[]
        if (!Array.isArray(items)) return ''
        const dateName = (items[0] as unknown as { name: string })?.name ?? ''
        const header = `<div style="font-weight:600;margin-bottom:4px">日付: ${dateName}</div>`

        // 当年のみ取得
        const curItems = items.filter(
          (item) => item.value != null && !item.seriesName.endsWith(PREV_YEAR_SUFFIX),
        )

        // 前年値マップ
        const prevMap = prevNameToValue?.(dateName)

        const rows = curItems
          .map((item) => {
            const curVal = item.value ?? 0
            const prevVal = prevMap?.get(item.seriesName)
            const valCell = `<span style="font-weight:600;font-family:monospace">${fmtValue(curVal)}</span>`

            if (prevVal != null && prevVal > 0) {
              const diff = curVal - prevVal
              const ratio = curVal / prevVal
              const diffSign = diff >= 0 ? '+' : ''
              const diffColor = diff >= 0 ? '#10b981' : '#ef4444'
              const ratioStr = (ratio * 100).toFixed(1) + '%'
              const yoyCell =
                `<span style="font-family:monospace;text-align:right;line-height:1.2;margin-left:8px">` +
                `<span style="color:${diffColor};font-size:10px">${diffSign}${fmtValue(diff)}</span><br/>` +
                `<span style="color:${diffColor};font-size:10px;font-weight:600">${ratioStr}</span>` +
                `</span>`
              return (
                `<div style="display:flex;align-items:center;gap:4px">` +
                `<span style="color:${item.color};flex:1;white-space:nowrap">${item.seriesName}</span>` +
                valCell +
                yoyCell +
                `</div>`
              )
            }

            return (
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="color:${item.color}">${item.seriesName}</span>` +
              valCell +
              `</div>`
            )
          })
          .join('')

        const prevLabel =
          hasPrev && prevYearLabel
            ? `<div style="font-size:10px;color:rgba(128,128,128,0.8);margin-top:2px">前年: ${prevYearLabel}</div>`
            : ''

        return header + rows + prevLabel
      },
    },
    legend: {
      ...standardLegend(theme),
      type: 'scroll',
      selectedMode: true,
    },
    xAxis: categoryXAxis(dates, theme),
    yAxis,
    series: [...curSeries, ...prevSeries],
  }
}

export const CategoryTrendChart = memo(function CategoryTrendChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
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
  const [metric, setMetric] = useState<TrendMetric>('amount')
  const [showYoY, setShowYoY] = useState(false)

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

  const dowParam = useMemo(
    () => (selectedDows.length > 0 ? selectedDows : undefined),
    [selectedDows],
  )

  const input = useMemo<CategoryDailyTrendInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
      topN,
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
      dow: dowParam,
    }
  }, [currentDateRange, selectedStoreIds, level, topN, drill.deptCode, drill.lineCode, dowParam])

  const {
    data: output,
    error,
    isLoading,
  } = useQueryWithHandler(queryExecutor, categoryDailyTrendHandler, input)

  const trendRows = output?.records ?? null

  // ── 前年クエリ（showYoY 時のみ） ──
  const prevYearDateRange = prevYearScope?.dateRange
  const hasPrevYearData = showYoY && prevYearDateRange != null
  const prevInput = useMemo<CategoryDailyTrendInput | null>(() => {
    if (!hasPrevYearData || !prevYearDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
      topN: 100, // 当年トップNに含まれるカテゴリは全て取得（ロジック側でフィルタ）
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
      dow: dowParam,
      isPrevYear: true,
    }
  }, [
    hasPrevYearData,
    prevYearDateRange,
    selectedStoreIds,
    level,
    drill.deptCode,
    drill.lineCode,
    dowParam,
  ])

  const { data: prevOutput } = useQueryWithHandler(
    queryExecutor,
    categoryDailyTrendHandler,
    prevInput,
  )
  const prevTrendRows = prevOutput?.records ?? null

  // ECharts の legend toggle で除外を管理するため、excludedCodes は不要に
  const emptyExcluded = useMemo(() => new Set<string>(), [])
  const { chartData, categories } = useMemo(
    () =>
      trendRows
        ? buildCategoryTrendData(trendRows, emptyExcluded, metric)
        : { chartData: [], categories: [] },
    [trendRows, emptyExcluded, metric],
  )

  // 前年データを当年日付軸にマッピング（showYoY 時のみ）
  const prevYearMapped = useMemo(() => {
    if (!showYoY || !prevTrendRows || !prevYearDateRange || chartData.length === 0) return undefined
    const currentDates = chartData.map((d) => d.date)
    return buildPrevYearTrendData(prevTrendRows, currentDates, categories, metric)
  }, [showYoY, prevTrendRows, prevYearDateRange, chartData, categories, metric])

  const isQuantityMode = metric === 'quantity'
  const prevYearLabelStr = useMemo(() => {
    if (!prevYearDateRange) return undefined
    const from = prevYearDateRange.from
    const to = prevYearDateRange.to
    return `${from.year}/${from.month}/${from.day}〜${to.month}/${to.day}`
  }, [prevYearDateRange])

  const option = useMemo(
    () =>
      buildOption(chartData, categories, theme, prevYearMapped, isQuantityMode, prevYearLabelStr),
    [chartData, categories, theme, prevYearMapped, isQuantityMode, prevYearLabelStr],
  )

  // ECharts クリックでドリルダウン
  const canDrill = level !== 'klass'
  const handleChartClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!canDrill) return
      const seriesName = params.seriesName as string
      // 前年シリーズのクリックではドリルダウンしない
      if (seriesName.endsWith(PREV_YEAR_SUFFIX)) return
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
  if (!queryExecutor || chartData.length === 0) {
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
          <ChipLabel>指標:</ChipLabel>
          <SegmentedControl
            options={METRIC_OPTIONS}
            value={metric}
            onChange={setMetric}
            ariaLabel="指標切替"
          />
        </ChipGroup>
        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          <SegmentedControl
            options={TOP_N_SEGMENT_OPTIONS}
            value={String(topN)}
            onChange={(v) => setTopN(Number(v))}
            ariaLabel="表示件数"
          />
        </ChipGroup>
        {prevYearScope && (
          <YoYToggle $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
            前年比 {showYoY ? 'ON' : 'OFF'}
          </YoYToggle>
        )}
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
            最大: {topCategory.name} (
            {isQuantityMode
              ? `${topCategory.totalAmount.toLocaleString()}点`
              : fmt(topCategory.totalAmount)}
            )
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
