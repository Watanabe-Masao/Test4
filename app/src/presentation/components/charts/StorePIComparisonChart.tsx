/**
 * StorePIComparisonChart — 店舗別・カテゴリ別PI値比較
 *
 * 1. 店舗別PI値の横棒グラフ（allStoreResults から計算）
 * 2. カテゴリ×店舗のPI値ヒートマップ（DuckDB クエリ）
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  storeCategoryPIHandler,
  type StoreCategoryPIInput,
} from '@/application/queries/cts/StoreCategoryPIHandler'
import { safeDivide } from '@/domain/calculations/utils'
import { useCurrencyFormat } from './chartTheme'
import { chartFontSize } from '@/presentation/theme/tokens'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip } from './echartsOptionBuilders'

type Metric = 'piAmount' | 'piQty'
type Level = 'department' | 'line' | 'klass'

const METRIC_OPTIONS: readonly { value: Metric; label: string }[] = [
  { value: 'piAmount', label: '金額PI' },
  { value: 'piQty', label: '点数PI' },
]

const LEVEL_OPTIONS: readonly { value: Level; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const STORE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

interface Props {
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly stores: ReadonlyMap<string, Store>
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export const StorePIComparisonChart = memo(function StorePIComparisonChart({
  allStoreResults,
  stores,
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [metric, setMetric] = useState<Metric>('piAmount')
  const [level, setLevel] = useState<Level>('department')

  // ── 店舗別PI値（allStoreResults から即座に計算） ──
  const storePIData = useMemo(() => {
    const entries: { storeId: string; name: string; piAmount: number; piQty: number }[] = []
    for (const [storeId, result] of allStoreResults) {
      if (result.totalCustomers <= 0) continue
      entries.push({
        storeId,
        name: stores.get(storeId)?.name ?? storeId,
        piAmount: Math.round(safeDivide(result.totalSales, result.totalCustomers, 0) * 1000),
        piQty:
          'totalQuantity' in result && typeof result.totalQuantity === 'number'
            ? Math.round(safeDivide(result.totalQuantity, result.totalCustomers, 0) * 1000)
            : 0,
      })
    }
    return entries.sort((a, b) =>
      metric === 'piAmount' ? b.piAmount - a.piAmount : b.piQty - a.piQty,
    )
  }, [allStoreResults, stores, metric])

  // ── カテゴリ×店舗PI値（DuckDB クエリ） ──
  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  const catInput = useMemo<StoreCategoryPIInput | null>(() => {
    if (!queryExecutor?.isReady) return null
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, level }
  }, [queryExecutor, currentDateRange, storeIds, level])

  const { data: catOutput } = useQueryWithHandler(queryExecutor, storeCategoryPIHandler, catInput)

  // ── 店舗別PI棒グラフ ──
  const storeBarOption = useMemo((): object => {
    if (storePIData.length === 0) return {}
    const names = [...storePIData].reverse().map((s) => s.name)
    const values = [...storePIData]
      .reverse()
      .map((s) => (metric === 'piAmount' ? s.piAmount : s.piQty))
    return {
      grid: { ...standardGrid(), left: 80, right: 60, bottom: 20, top: 10 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text4,
          formatter: (v: number) => (metric === 'piAmount' ? cf.formatWithUnit(v) : String(v)),
        },
        splitLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: { color: theme.colors.text, width: 70, overflow: 'truncate' as const },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      series: [
        {
          type: 'bar' as const,
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: STORE_COLORS[i % STORE_COLORS.length] },
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'right' as const,
            formatter: (p: { value: number }) =>
              metric === 'piAmount' ? cf.formatWithUnit(p.value) : String(Math.round(p.value)),
            fontSize: chartFontSize.axis,
            color: theme.colors.text3,
          },
        },
      ],
    }
  }, [storePIData, metric, theme, cf])

  // ── カテゴリ×店舗ヒートマップ ──
  const heatmapOption = useMemo((): object => {
    if (!catOutput?.records.length) return {}
    const records = catOutput.records

    // カテゴリ一覧（全店合算でソート）
    const catTotals = new Map<string, number>()
    for (const r of records) {
      const val = metric === 'piAmount' ? r.piAmount : r.piQty
      catTotals.set(r.name, (catTotals.get(r.name) ?? 0) + val)
    }
    const categories = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)

    // 店舗一覧
    const storeIdSet = new Set(records.map((r) => r.storeId))
    const storeList = [...storeIdSet].map((id) => ({
      id,
      name: stores.get(id)?.name ?? id,
    }))

    const catIdx = new Map(categories.map((c, i) => [c, i]))

    let maxVal = 0
    const heatData: [number, number, number][] = []
    for (const r of records) {
      const ci = catIdx.get(r.name)
      if (ci == null) continue
      const si = storeList.findIndex((s) => s.id === r.storeId)
      if (si < 0) continue
      const val = Math.round(metric === 'piAmount' ? r.piAmount : r.piQty)
      heatData.push([ci, si, val])
      if (val > maxVal) maxVal = val
    }

    return {
      grid: { left: 80, right: 20, top: 10, bottom: 30, containLabel: false },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data?: [number, number, number] }
          if (!Array.isArray(p?.data)) return ''
          const [ci, si, val] = p.data
          const cat = categories[ci] ?? ''
          const store = storeList[si]?.name ?? ''
          const fmtVal = metric === 'piAmount' ? cf.formatWithUnit(val) : `${val}点`
          return `${store} / ${cat}<br/>${fmtVal}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: categories,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          rotate: 30,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: {
        type: 'category' as const,
        data: storeList.map((s) => s.name),
        axisLabel: {
          color: theme.colors.text,
          fontSize: chartFontSize.axis,
          width: 70,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      visualMap: {
        min: 0,
        max: maxVal || 1,
        show: false,
        inRange: { color: ['#f0f4ff', '#93b5ff', '#3b82f6', '#1e40af'] },
      },
      series: [
        {
          type: 'heatmap' as const,
          data: heatData,
          itemStyle: { borderWidth: 1, borderColor: theme.colors.bg },
          label: {
            show: true,
            fontSize: chartFontSize.axis,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: (params: unknown) => {
              const p = params as { data?: [number, number, number] }
              if (!Array.isArray(p?.data)) return ''
              const val = p.data[2]
              if (val === 0) return ''
              return metric === 'piAmount' ? cf.formatWithUnit(val) : String(val)
            },
          },
        },
      ],
    }
  }, [catOutput, stores, metric, theme, cf])

  if (storePIData.length < 2) return null

  const storeBarH = Math.max(150, storePIData.length * 32 + 40)
  const storeCount = catOutput ? new Set(catOutput.records.map((r) => r.storeId)).size : 0
  const heatmapH = Math.max(150, storeCount * 32 + 50)

  return (
    <ChartCard
      title="店舗別・カテゴリ別PI値比較"
      subtitle="PI = 売上÷客数×1000（店舗間の販売効率比較）"
      collapsible
      toolbar={
        <div style={{ display: 'flex', gap: 8 }}>
          <SegmentedControl
            options={METRIC_OPTIONS}
            value={metric}
            onChange={setMetric}
            ariaLabel="PI指標"
            layoutId="store-pi-metric"
          />
          <SegmentedControl
            options={LEVEL_OPTIONS}
            value={level}
            onChange={setLevel}
            ariaLabel="階層"
            layoutId="store-pi-level"
          />
        </div>
      }
    >
      {/* 店舗別PI棒グラフ */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: theme.typography.fontSize.micro,
            color: theme.colors.text3,
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          店舗別{metric === 'piAmount' ? '金額' : '点数'}PI値
        </div>
        <EChart
          option={storeBarOption as EChartsOption}
          height={storeBarH}
          ariaLabel="店舗別PI値比較"
        />
      </div>

      {/* カテゴリ×店舗ヒートマップ */}
      {catOutput && catOutput.records.length > 0 ? (
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.micro,
              color: theme.colors.text3,
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            カテゴリ×店舗{metric === 'piAmount' ? '金額' : '点数'}PI値（Top10）
          </div>
          <EChart
            option={heatmapOption as EChartsOption}
            height={heatmapH}
            ariaLabel="カテゴリ×店舗PI値"
          />
        </div>
      ) : queryExecutor?.isReady ? (
        <ChartLoading />
      ) : (
        <ChartEmpty message="DuckDB未準備" />
      )}
    </ChartCard>
  )
})
