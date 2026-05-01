/**
 * StorePIComparisonChart — 店舗別・カテゴリ別PI値比較
 *
 * 1. 店舗別PI値の横棒グラフ（allStoreResults から計算）
 * 2. カテゴリ×店舗のPI値ヒートマップ（plan hook から受け取り）
 *
 * @guard H4 component に acquisition logic 禁止
 * @guard H6 ChartCard は通知のみ — onVisibilityChange で親に伝達
 * @responsibility R:unclassified
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { StoreCategoryPIOutput } from '@/application/queries/cts/StoreCategoryPIHandler'
import { buildStorePIData, buildHeatmapData } from './StorePIComparisonChart.builders'
import { useCurrencyFormat } from './chartTheme'
import { chartFontSize, palette } from '@/presentation/theme/tokens'
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
  palette.primary,
  palette.successDark,
  palette.warningDark,
  palette.dangerDark,
  palette.purpleDark,
  palette.cyanDark,
  palette.pinkDark,
  '#14b8a6',
]

export type StorePILevel = Level

interface Props {
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly stores: ReadonlyMap<string, Store>
  readonly catOutput: StoreCategoryPIOutput | null
  readonly catIsLoading: boolean
  readonly level: Level
  readonly onLevelChange: (level: Level) => void
  /** CTS 由来の店舗別販売点数（点数PI計算用） */
  readonly ctsQuantityByStore?: ReadonlyMap<string, number>
  /** CustomerFact 由来の店舗別客数（PI値の除数） */
  readonly storeCustomerMap?: ReadonlyMap<string, number>
  /** @guard H6 ChartCard は通知のみ — 親 plan hook が取得判断に利用 */
  readonly onVisibilityChange?: (visible: boolean) => void
}

export const StorePIComparisonChart = memo(function StorePIComparisonChart({
  allStoreResults,
  stores,
  catOutput,
  catIsLoading,
  level,
  onLevelChange,
  ctsQuantityByStore,
  storeCustomerMap,
  onVisibilityChange,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [metric, setMetric] = useState<Metric>('piAmount')

  // ── 店舗別PI値（allStoreResults + storeCustomerMap から即座に計算） ──
  const storePIData = useMemo(
    () => buildStorePIData(allStoreResults, stores, metric, ctsQuantityByStore, storeCustomerMap),
    [allStoreResults, stores, metric, ctsQuantityByStore, storeCustomerMap],
  )

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
  const heatmap = useMemo(
    () => (catOutput?.records.length ? buildHeatmapData(catOutput, stores, metric) : null),
    [catOutput, stores, metric],
  )

  const heatmapOption = useMemo((): object => {
    if (!heatmap) return {}
    const { categories, storeList, heatData, maxVal } = heatmap

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
        data: [...categories],
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
          data: [...heatData],
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
  }, [heatmap, metric, theme, cf])

  if (storePIData.length < 2) return null

  const storeBarH = Math.max(150, storePIData.length * 32 + 40)
  const storeCount = heatmap ? heatmap.storeList.length : 0
  const heatmapH = Math.max(150, storeCount * 32 + 50)

  return (
    <ChartCard
      title="店舗別・カテゴリ別PI値比較"
      subtitle="PI = 売上÷客数×1000（店舗間の販売効率比較）"
      collapsible
      onVisibilityChange={onVisibilityChange}
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
            onChange={onLevelChange}
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
      ) : catIsLoading ? (
        <ChartLoading />
      ) : (
        <ChartEmpty message="カテゴリデータなし" />
      )}
    </ChartCard>
  )
})
