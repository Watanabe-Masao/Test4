import { chartFontSize } from '@/presentation/theme/tokens'
/**
 * CategoryBarChart — カテゴリ別売上棒グラフ
 *
 * 期間内のカテゴリ別売上/点数を横棒グラフで表示。
 * 短期間（1〜数日）の分析に適した集約ビュー。
 *
 * 機能:
 * - 部門/ライン/クラスの階層切替
 * - ダブルクリックで下位レベルにドリルダウン
 * - 前年比較（前年位置マーカー + 前年比率表示）
 * - 金額/点数の指標切替
 * - TopN 表示件数切替
 */
import { memo, useMemo, useState, useCallback } from 'react'
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
  type TrendMetric,
} from '@/features/category/ui/charts/CategoryTrendChartLogic'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartEmpty } from '@/presentation/components/charts/ChartState'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'

type Level = 'department' | 'line' | 'klass'

const LEVEL_OPTIONS: readonly { value: Level; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const NEXT_LEVEL: Record<Level, Level | null> = {
  department: 'line',
  line: 'klass',
  klass: null,
}

const METRIC_OPTIONS: readonly { value: TrendMetric; label: string }[] = [
  { value: 'amount', label: '金額' },
  { value: 'quantity', label: '点数' },
]

const TOPN_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '5', label: 'Top5' },
  { value: '8', label: 'Top8' },
  { value: '10', label: 'Top10' },
]

const CATEGORY_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly embedded?: boolean
}

interface DrillState {
  readonly level: Level
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
  readonly breadcrumbs: readonly string[]
}

export const CategoryBarChart = memo(function CategoryBarChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  embedded,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [drill, setDrill] = useState<DrillState>({ level: 'department', breadcrumbs: [] })
  const [metric, setMetric] = useState<TrendMetric>('amount')
  const [topN, setTopN] = useState('8')

  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  // 当年クエリ
  const input = useMemo<CategoryDailyTrendInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level: drill.level,
      topN: Number(topN),
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
    }
  }, [currentDateRange, storeIds, drill.level, drill.deptCode, drill.lineCode, topN])

  const { data: output, isLoading } = useQueryWithHandler(
    queryExecutor,
    categoryDailyTrendHandler,
    input,
  )

  // 前年クエリ
  const prevInput = useMemo<CategoryDailyTrendInput | null>(() => {
    if (!prevYearScope?.dateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearScope.dateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level: drill.level,
      topN: Number(topN),
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
      isPrevYear: true,
    }
  }, [prevYearScope, storeIds, drill.level, drill.deptCode, drill.lineCode, topN])

  const { data: prevOutput } = useQueryWithHandler(
    queryExecutor,
    categoryDailyTrendHandler,
    prevInput,
  )

  // 日次データを期間合算してカテゴリ別合計に変換
  const { categories, prevByCode } = useMemo(() => {
    const curResult = output?.records
      ? buildCategoryTrendData(output.records, new Set(), metric)
      : null
    const cats = curResult?.categories ?? []

    // 前年データも同様に合算
    const prevMap = new Map<string, number>()
    if (prevOutput?.records) {
      const prevResult = buildCategoryTrendData(prevOutput.records, new Set(), metric)
      for (const cat of prevResult.categories) {
        prevMap.set(cat.code, cat.totalAmount)
      }
    }
    return { categories: cats, prevByCode: prevMap }
  }, [output, prevOutput, metric])

  // ダブルクリックでドリルダウン
  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      const name = params.name as string | undefined
      if (!name) return
      const nextLevel = NEXT_LEVEL[drill.level]
      if (!nextLevel) return
      const cat = categories.find((c) => c.name === name)
      if (!cat) return
      setDrill({
        level: nextLevel,
        deptCode: drill.level === 'department' ? cat.code : drill.deptCode,
        deptName: drill.level === 'department' ? cat.name : drill.deptName,
        lineCode: drill.level === 'line' ? cat.code : drill.lineCode,
        lineName: drill.level === 'line' ? cat.name : drill.lineName,
        breadcrumbs: [...drill.breadcrumbs, name],
      })
    },
    [drill, categories],
  )

  const option = useMemo((): EChartsOption => {
    if (categories.length === 0) return {}

    const reversed = [...categories].reverse()
    const names = reversed.map((c) => c.name)
    const values = reversed.map((c) => c.totalAmount)
    const hasPrev = prevByCode.size > 0

    // 前年マーカー
    const prevValues = reversed.map((c) => prevByCode.get(c.code) ?? null)

    const series: object[] = [
      {
        name: metric === 'amount' ? '売上' : '点数',
        type: 'bar' as const,
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
        })),
        barWidth: '60%',
        label: {
          show: true,
          position: 'right' as const,
          formatter: (p: { value: number }) =>
            metric === 'amount' ? cf.formatWithUnit(p.value) : `${p.value.toLocaleString()}点`,
          fontSize: chartFontSize.axis,
          color: theme.colors.text3,
        },
      },
    ]

    if (hasPrev) {
      series.push({
        name: '前年',
        type: 'scatter' as const,
        data: prevValues,
        symbol: 'rect',
        symbolSize: [3, 18],
        itemStyle: { color: theme.colors.text3 },
        z: 15,
      })
    }

    return {
      grid: { ...standardGrid(), left: 100, right: 80, bottom: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; marker: string }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          const cat = (items[0] as unknown as { name: string }).name ?? ''
          const curItem = items.find((i) => i.seriesName !== '前年')
          const prevItem = items.find((i) => i.seriesName === '前年')
          const curVal = curItem?.value ?? 0
          const fmtVal =
            metric === 'amount' ? cf.formatWithUnit(curVal) : `${curVal.toLocaleString()}点`
          let html = `<div style="font-weight:600;margin-bottom:4px">${cat}</div>`
          html += `<div>${curItem?.marker ?? ''}${fmtVal}</div>`
          if (prevItem?.value != null) {
            const prevVal = prevItem.value
            const fmtPrev =
              metric === 'amount' ? cf.formatWithUnit(prevVal) : `${prevVal.toLocaleString()}点`
            const diff = curVal - prevVal
            const ratio = prevVal !== 0 ? diff / Math.abs(prevVal) : null
            html += `<div style="color:${theme.colors.text3}">前年: ${fmtPrev}</div>`
            if (ratio != null) {
              const color =
                ratio >= 0 ? theme.colors.palette.successDark : theme.colors.palette.dangerDark
              html += `<div style="color:${color}">前年比: ${formatPercent(ratio)}</div>`
            }
          }
          return html
        },
      },
      legend: hasPrev ? { ...standardLegend(theme), bottom: 0 } : undefined,
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text4,
          formatter: (v: number) =>
            metric === 'amount' ? cf.formatWithUnit(v) : `${v.toLocaleString()}`,
        },
        splitLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: {
          color: theme.colors.text,
          width: 90,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        triggerEvent: true,
      },
      series,
    }
  }, [categories, prevByCode, theme, cf, metric])

  const title = (() => {
    const base = 'カテゴリ別構成'
    if (drill.breadcrumbs.length === 0) return base
    return `${base}（${drill.breadcrumbs.join(' > ')}）`
  })()

  if (isLoading && categories.length === 0) {
    return embedded ? (
      <ChartLoading />
    ) : (
      <ChartCard title={title}>
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!queryExecutor?.isReady || categories.length === 0) {
    return embedded ? null : (
      <ChartCard title={title}>
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const chartH = Math.max(200, categories.length * 28 + 60)

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {drill.breadcrumbs.length > 0 && (
        <button
          style={{
            padding: '2px 8px',
            fontSize: theme.typography.fontSize.micro,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            background: 'transparent',
            color: theme.colors.palette.primary,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (drill.breadcrumbs.length <= 1) {
              setDrill({ level: 'department', breadcrumbs: [] })
            } else {
              setDrill((prev) => ({
                ...prev,
                level: prev.level === 'klass' ? 'line' : 'department',
                lineCode: prev.level === 'klass' ? prev.lineCode : undefined,
                lineName: prev.level === 'klass' ? prev.lineName : undefined,
                breadcrumbs: prev.breadcrumbs.slice(0, -1),
              }))
            }
          }}
        >
          ← 戻る
        </button>
      )}
      <SegmentedControl
        options={LEVEL_OPTIONS}
        value={drill.level}
        onChange={(v) => setDrill({ level: v, breadcrumbs: [] })}
        ariaLabel="階層レベル"
      />
      <SegmentedControl
        options={METRIC_OPTIONS}
        value={metric}
        onChange={setMetric}
        ariaLabel="指標"
      />
      <SegmentedControl
        options={TOPN_OPTIONS}
        value={topN}
        onChange={setTopN}
        ariaLabel="表示件数"
      />
    </div>
  )

  const chart = (
    <EChart
      option={option}
      height={chartH}
      ariaLabel="カテゴリ別構成"
      onDblClick={handleDblClick}
    />
  )

  if (embedded) {
    return (
      <>
        {toolbar}
        {chart}
      </>
    )
  }

  return (
    <ChartCard
      title={title}
      subtitle="期間内のカテゴリ別売上構成（ダブルクリックでドリルダウン）"
      collapsible
      toolbar={toolbar}
    >
      {chart}
    </ChartCard>
  )
})
