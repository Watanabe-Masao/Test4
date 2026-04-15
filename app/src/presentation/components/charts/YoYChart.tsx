/**
 * 前年比較チャート (ECharts)
 *
 * パイプライン:
 *   (scope, prevYearScope, selectedStoreIds) → buildYoyDailyInput (pure, application)
 *     → QueryHandler → YoYChartLogic.ts (data builder / ViewModel)
 *     → YoYChartOptionBuilder.ts (option builder)
 *     → EChart
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
 * @migration unify-period-analysis Phase 5 三段構造: option builder
 *   (buildLineOption / buildWaterfallOption) を YoYChartOptionBuilder.ts に
 *   分離。chart component は data builder (YoYChartLogic.ts) と option
 *   builder (YoYChartOptionBuilder.ts) を orchestration するのみ。
 *   見本実装: TimeSlotChart (.vm.ts + OptionBuilder.ts + View.tsx) に次ぐ 2 例目。
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
import { buildYoYChartData, buildYoYWaterfallData, computeYoYSummary } from './YoYChartLogic'
import { buildLineOption, buildWaterfallOption } from './YoYChartOptionBuilder'
import { useCurrencyFormatter, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart } from './EChart'
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
