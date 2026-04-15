/**
 * 前年比較チャート (ECharts)
 *
 * パイプライン:
 *   (scope, prevYearScope, selectedStoreIds) → buildYoyDailyInput (pure, application)
 *     → QueryHandler → YoYChartLogic.ts → ECharts option → EChart
 *
 * 表示モード:
 *   - 日次比較: 当年売上線 + 前年売上線（破線）+ 差分棒グラフ
 *   - ウォーターフォール: 前年→当年の累積差分を滝グラフで表示
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBYoyDaily 直接 import）
 * @migration unify-period-analysis Phase 5: scope 内部フィールド
 *   (effectivePeriod1 / effectivePeriod2 / alignmentMode) への直接アクセスを
 *   `application/hooks/plans/buildYoyDailyInput.ts` pure builder に移譲。
 *   widget は scope 参照を「存在判定」のみに限定し、input 構築は builder 経由。
 *   `comparisonResolvedRangeSurfaceGuard` の allowlist から除外された見本実装。
 * @responsibility R:chart-view
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useYoYChartPlan } from '@/application/hooks/plans/useYoYChartPlan'
import { buildYoyDailyInput } from '@/application/hooks/plans/buildYoyDailyInput'
import {
  buildYoYChartData,
  buildYoYWaterfallData,
  computeYoYSummary,
  type YoYChartDataPoint,
  type WaterfallItem,
} from './YoYChartLogic'
import { useCurrencyFormatter, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { categoryXAxis, lineDefaults } from './builders'
import { SummaryRow, SummaryItem } from './YoYChart.styles'

type ViewMode = 'line' | 'waterfall'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'line', label: '日次比較' },
  { value: 'waterfall', label: 'ウォーターフォール' },
]

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly scope: ComparisonScope | null
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

function buildLineOption(chartData: readonly YoYChartDataPoint[], theme: AppTheme): EChartsOption {
  const dates = chartData.map((d) => d.date)
  return {
    grid: standardGrid(),
    tooltip: standardTooltip(theme),
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '前年差',
        type: 'bar',
        data: chartData.map((d) => d.diff),
        itemStyle: { color: theme.colors.palette.success, opacity: 0.4 },
        barWidth: 6,
      },
      {
        name: '前年売上',
        type: 'line',
        data: chartData.map((d) => d.prevSales),
        ...lineDefaults({ color: theme.colors.palette.slate, width: 1.5, dashed: true }),
        connectNulls: true,
      },
      {
        name: '当年売上',
        type: 'line',
        data: chartData.map((d) => d.curSales),
        ...lineDefaults({ color: theme.colors.palette.primary, width: 2 }),
        symbolSize: 4,
      },
    ],
  }
}

function buildWaterfallOption(
  waterfallData: readonly WaterfallItem[],
  theme: AppTheme,
): EChartsOption {
  const names = waterfallData.map((d) => d.name)
  return {
    grid: { ...standardGrid(), bottom: 50 },
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params]
        // スタックバー方式: seriesIndex=1 が表示バー
        const p =
          (arr as { dataIndex: number; seriesIndex?: number; name: string }[]).find(
            (s) => s.seriesIndex === 1,
          ) ?? (arr[0] as { dataIndex: number; name: string } | undefined)
        if (!p) return ''
        const item = waterfallData[p.dataIndex]
        if (!item) return ''
        return `${p.name}<br/>${toCommaYen(item.value)}`
      },
    },
    xAxis: Object.assign({}, categoryXAxis(names, theme), {
      axisLabel: {
        ...(categoryXAxis(names, theme).axisLabel as object),
        rotate: 45,
      },
    }),
    yAxis: yenYAxis(theme),
    series: [
      // 透明ベース（ウォーターフォールの浮遊バー効果）
      {
        type: 'bar',
        stack: 'wf',
        data: waterfallData.map((d) => d.base),
        itemStyle: { color: 'transparent', borderColor: 'transparent' },
        emphasis: { disabled: true },
        barWidth: '60%',
      },
      // 表示バー
      {
        type: 'bar',
        stack: 'wf',
        data: waterfallData.map((d) => {
          const color = d.isTotal
            ? theme.colors.palette.primary
            : d.value >= 0
              ? sc.positive
              : sc.negative
          return {
            value: d.bar,
            itemStyle: { color, opacity: d.isTotal ? 0.7 : 0.85 },
          }
        }),
        barWidth: '60%',
      },
    ],
  }
}

export const YoYChart = memo(function YoYChart({
  queryExecutor,
  scope,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('line')

  // Phase 5: scope 内部フィールドへの直接アクセスは application 層の pure
  // builder に集約した。本 widget は scope を「存在判定」と builder への
  // pass-through のみに使う。
  const input = useMemo(
    () => buildYoyDailyInput(scope, prevYearScope, selectedStoreIds),
    [scope, prevYearScope, selectedStoreIds],
  )

  const { data: output, isLoading, error } = useYoYChartPlan(queryExecutor, input)

  const rows = output?.records ?? null

  // Phase 5 chart 薄化: chartData / waterfallData / summary を 1 useMemo に
  // 統合。描画に必要な派生値はすべて同じ rows から導出されるため、まとめて
  // 計算することで useMemo 数を減らし、chart-view の責務上限 (useMemo ≤ 4) を
  // 守る。
  const { chartData, waterfallData, summary } = useMemo(() => {
    const cd = rows ? buildYoYChartData(rows) : []
    const wd = viewMode === 'waterfall' && cd.length > 0 ? buildYoYWaterfallData(cd) : []
    return {
      chartData: cd,
      waterfallData: wd,
      summary: computeYoYSummary(cd),
    }
  }, [rows, viewMode])
  const growthRateLabel = summary.growthRate != null ? toPct(summary.growthRate, 1) : '-'

  const option = useMemo(
    () =>
      viewMode === 'line'
        ? buildLineOption(chartData, theme)
        : buildWaterfallOption(waterfallData, theme),
    [viewMode, chartData, waterfallData, theme],
  )

  if (error) {
    return (
      <ChartCard title="前年比較">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !rows) {
    return (
      <ChartCard title="前年比較">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!queryExecutor || !scope || chartData.length === 0) {
    return (
      <ChartCard title="前年比較">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const subtitle =
    viewMode === 'line'
      ? '当年 vs 前年 日別売上 | 月跨ぎ対応 | 棒 = 前年差'
      : '前年→当年の累積差分 | 青 = 開始/終了 | 水色 = プラス | 橙 = マイナス'

  const toolbar = (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={viewMode}
      onChange={setViewMode}
      ariaLabel="ビュー切替"
    />
  )

  return (
    <ChartCard title="前年比較" subtitle={subtitle} toolbar={toolbar}>
      <EChart option={option} height={300} ariaLabel="前年比較チャート" />

      <SummaryRow>
        <SummaryItem>当年計: {fmt(summary.totalCur)}</SummaryItem>
        <SummaryItem>前年計: {fmt(summary.totalPrev)}</SummaryItem>
        <SummaryItem $accent={summary.totalDiff >= 0 ? sc.positive : sc.negative}>
          差分: {summary.totalDiff >= 0 ? '+' : ''}
          {fmt(summary.totalDiff)} ({growthRateLabel})
        </SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
