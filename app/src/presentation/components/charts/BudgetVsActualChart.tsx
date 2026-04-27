import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart } from '@/presentation/components/charts/EChart'
import {
  useChartTheme,
  useCurrencyFormatter,
  toPct,
} from '@/presentation/components/charts/chartTheme'

import { ChartCard } from '@/presentation/components/charts/ChartCard'
import {
  ToggleRow,
  ViewToggle,
  ViewBtn,
  CompareChipGroup,
  CompareChip,
  SummaryRow,
  Metric,
  MetricLabel,
  MetricValue,
  ProgressBarWrap,
  ProgressTrack,
  ProgressFill,
  ProgressLabel,
  ChartArea,
  VIEW_LABELS,
  VIEW_TITLES,
  COMPARE_LABELS,
  VIEWS_BY_COMPARE,
  COMPARE_TITLES,
} from './BudgetVsActualChart.styles'
import type { BudgetViewType, CompareMode } from './BudgetVsActualChart.styles'
import { type DataPoint, buildOption } from './BudgetVsActualChart.builders'
import {
  computeBudgetProgress,
  buildPrevYearCumMap,
  enrichChartData,
  computePrevYearComparison,
} from './BudgetVsActualChart.vm'

interface Props {
  data: readonly DataPoint[]
  budget: number
  showPrevYear?: boolean
  /** 営業日数（着地見込み計算用）  * @responsibility R:unclassified
   */
  salesDays?: number
  /** 月の総日数 */
  daysInMonth?: number
  year: number
  month: number
  /** 前年日別データ（前年差ビュー用） */
  prevYearDaily?: ReadonlyMap<string, { sales: number }>
  rangeStart?: number
  rangeEnd?: number
}

export const BudgetVsActualChart = memo(function BudgetVsActualChart({
  data,
  budget,
  showPrevYear,
  salesDays,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const [view, setView] = useState<BudgetViewType>('line')
  const totalDaysForSlider = daysInMonth ?? data.length
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? totalDaysForSlider
  const hasPrevYear = showPrevYear || data.some((d) => d.prevYearCum != null && d.prevYearCum > 0)

  // ── 比較モード ──
  const [compareMode, setCompareMode] = useState<CompareMode>('budgetVsActual')
  const availableViews = VIEWS_BY_COMPARE[compareMode]

  // 比較モード変更時、現在のビューが利用不可なら line にフォールバック
  const effectiveView = availableViews.includes(view) ? view : 'line'

  const showBudget = compareMode !== 'currentVsPrev'
  const showPrevYearSeries = compareMode !== 'budgetVsActual' && hasPrevYear

  // 予算進捗率・着地予想（vm から導出）
  const progress = useMemo(
    () => computeBudgetProgress(data, budget, salesDays, daysInMonth),
    [data, budget, salesDays, daysInMonth],
  )
  const { currentActual, currentBudgetCum, progressRate, projected, projectedAchievement } =
    progress

  const statusColor = (rate: number) =>
    rate >= 1.0 ? ct.semantic.positive : rate >= 0.9 ? ct.semantic.markupRate : ct.semantic.negative
  const paceColor = statusColor(progressRate)
  const projColor = statusColor(projectedAchievement)

  // 前年累計マップ（vm から導出）
  const totalDaysForCalc = daysInMonth ?? data.length
  const prevYearCumMap = useMemo(
    () => buildPrevYearCumMap(prevYearDaily, totalDaysForCalc, year, month),
    [prevYearDaily, totalDaysForCalc, year, month],
  )
  const hasPrevYearDiff =
    prevYearCumMap.size > 0 && (prevYearCumMap.get(prevYearCumMap.size) ?? 0) > 0

  // 差分・達成率を含む拡張データ（vm から導出）
  const chartData = useMemo(
    () => enrichChartData(data, prevYearCumMap, hasPrevYearDiff, rangeStart, rangeEnd),
    [data, prevYearCumMap, hasPrevYearDiff, rangeStart, rangeEnd],
  )

  const chartTitle = COMPARE_TITLES[compareMode]?.[effectiveView] ?? VIEW_TITLES[effectiveView]

  // 前年比較サマリー（vm から導出）
  const latestWithSales = [...data].reverse().find((d) => d.actualCum > 0)
  const latestPrevYearCum = latestWithSales?.prevYearCum ?? null
  const { diffAmt: prevYearDiffAmt, growth: prevYearGrowth } = computePrevYearComparison(
    currentActual,
    latestPrevYearCum,
  )

  const option = useMemo(
    () =>
      buildOption(
        chartData,
        effectiveView,
        showBudget,
        showPrevYearSeries,
        hasPrevYearDiff,
        budget,
        fmt,
        theme,
      ),
    [chartData, effectiveView, showBudget, showPrevYearSeries, hasPrevYearDiff, budget, fmt, theme],
  )

  return (
    <ChartCard
      title={chartTitle}
      ariaLabel="予算実績比較チャート"
      toolbar={
        <ToggleRow>
          {hasPrevYear && (
            <CompareChipGroup>
              {(Object.keys(COMPARE_LABELS) as CompareMode[]).map((m) => (
                <CompareChip key={m} $active={compareMode === m} onClick={() => setCompareMode(m)}>
                  {COMPARE_LABELS[m]}
                </CompareChip>
              ))}
            </CompareChipGroup>
          )}
          <ViewToggle>
            {availableViews.map((v) => (
              <ViewBtn key={v} $active={effectiveView === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ViewBtn>
            ))}
          </ViewToggle>
        </ToggleRow>
      }
    >
      {/* ── 予算サマリー（予算含むモード） ── */}
      {showBudget && budget > 0 && currentActual > 0 && (
        <SummaryRow>
          <Metric>
            <MetricLabel>実績累計</MetricLabel>
            <MetricValue>{fmt(currentActual)}円</MetricValue>
          </Metric>
          <ProgressBarWrap>
            <ProgressLabel>
              <span>予算進捗 {toPct(progressRate)}</span>
              <span>
                {fmt(currentBudgetCum)}円 / {fmt(budget)}円
              </span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $pct={progressRate * 100} $color={paceColor} />
            </ProgressTrack>
          </ProgressBarWrap>
          <Metric>
            <MetricLabel>着地見込</MetricLabel>
            <MetricValue $color={projColor}>
              {fmt(projected)}円 ({toPct(projectedAchievement)})
            </MetricValue>
          </Metric>
        </SummaryRow>
      )}
      {/* ── 前年比サマリー（当年vs前年モード） ── */}
      {compareMode === 'currentVsPrev' && currentActual > 0 && latestPrevYearCum != null && (
        <SummaryRow>
          <Metric>
            <MetricLabel>当期累計</MetricLabel>
            <MetricValue>{fmt(currentActual)}円</MetricValue>
          </Metric>
          <Metric>
            <MetricLabel>比較期累計</MetricLabel>
            <MetricValue>{fmt(latestPrevYearCum)}円</MetricValue>
          </Metric>
          {prevYearDiffAmt != null && (
            <Metric>
              <MetricLabel>比較期差</MetricLabel>
              <MetricValue
                $color={prevYearDiffAmt >= 0 ? ct.semantic.positive : ct.semantic.negative}
              >
                {prevYearDiffAmt >= 0 ? '+' : ''}
                {fmt(prevYearDiffAmt)}円
                {prevYearGrowth != null &&
                  ` (${prevYearGrowth >= 0 ? '+' : ''}${prevYearGrowth.toFixed(1)}%)`}
              </MetricValue>
            </Metric>
          )}
        </SummaryRow>
      )}
      <ChartArea>
        <EChart option={option} height={300} ariaLabel="予算実績比較チャート" />
      </ChartArea>
    </ChartCard>
  )
})
