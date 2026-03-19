import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { useChartTheme, useCurrencyFormatter, toAxisYen, toPct } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import {
  Wrapper,
  HeaderRow,
  Title,
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
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { standardGrid, standardTooltip, standardLegend, toCommaYen } from './echartsOptionBuilders'
import { valueYAxis, percentYAxis } from './builders'
import { chartFontSize } from '@/presentation/theme/tokens'

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
  prevYearCum?: number | null
}

interface ChartDataPoint extends DataPoint {
  diff: number | null
  achieveRate: number | null
  budgetDiff: number | null
  prevYearDiff: number | null
}

interface Props {
  data: readonly DataPoint[]
  budget: number
  showPrevYear?: boolean
  /** 営業日数（着地見込み計算用） */
  salesDays?: number
  /** 月の総日数 */
  daysInMonth?: number
  year: number
  month: number
  /** 前年日別データ（前年差ビュー用） */
  prevYearDaily?: ReadonlyMap<string, { sales: number }>
}

const allLabels: Record<string, string> = {
  actualCum: '実績累計',
  budgetCum: '予算累計',
  prevYearCum: '比較期累計',
  diff: '予算差異',
  achieveRate: '達成率(%)',
  budgetDiff: '予算差（累計）',
  prevYearDiff: '比較期差（累計）',
}

function buildOption(
  chartData: readonly ChartDataPoint[],
  view: BudgetViewType,
  showBudget: boolean,
  showPrevYearSeries: boolean,
  hasPrevYearDiff: boolean,
  budget: number,
  fmt: (v: number) => string,
  theme: AppTheme,
): EChartsOption {
  const days = chartData.map((d) => String(d.day))
  const xAxis = {
    type: 'category' as const,
    data: days,
    axisLabel: {
      color: theme.colors.text3,
      fontSize: chartFontSize.axis,
      fontFamily: theme.typography.fontFamily.mono,
    },
    axisLine: { lineStyle: { color: theme.colors.border } },
    axisTick: { show: false },
  }

  if (view === 'line') {
    const series: EChartsOption['series'] = [
      {
        name: 'actualCum',
        type: 'line' as const,
        data: chartData.map((d) => d.actualCum),
        lineStyle: { color: theme.chart.barPositive, width: 2.5 },
        itemStyle: { color: theme.chart.barPositive },
        symbol: 'none',
        emphasis: {
          itemStyle: {
            color: theme.chart.barPositive,
            borderColor: theme.colors.bg2,
            borderWidth: 2,
          },
        },
        markLine:
          showBudget && budget > 0
            ? {
                data: [
                  {
                    yAxis: budget,
                    label: {
                      formatter: `月間予算 ${fmt(budget)}`,
                      position: 'end' as const,
                      fontSize: chartFontSize.axis,
                      fontFamily: theme.typography.fontFamily.mono,
                      color: theme.colors.palette.warningDark,
                    },
                  },
                ],
                lineStyle: {
                  color: theme.colors.palette.warningDark,
                  type: 'dashed' as const,
                  width: 1.5,
                },
                symbol: 'none',
              }
            : undefined,
      },
    ]
    if (showBudget) {
      series.push({
        name: 'budgetCum',
        type: 'line' as const,
        data: chartData.map((d) => d.budgetCum),
        lineStyle: { color: theme.chart.budget, width: 2, type: 'dashed' },
        itemStyle: { color: theme.chart.budget },
        symbol: 'none',
      })
    }
    if (showPrevYearSeries) {
      series.push({
        name: 'prevYearCum',
        type: 'line' as const,
        data: chartData.map((d) => d.prevYearCum ?? null),
        lineStyle: { color: theme.chart.previousYear, width: 1.5, type: 'dashed' },
        itemStyle: { color: theme.chart.previousYear },
        symbol: 'none',
        connectNulls: true,
      })
    }
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = params as { name: string; seriesName: string; value: number }[]
          if (!Array.isArray(ps) || ps.length === 0) return ''
          let html = `${ps[0].name}日`
          for (const p of ps) {
            const label = allLabels[p.seriesName] ?? p.seriesName
            html += `<br/>${label}: ${toCommaYen(p.value)}`
          }
          return html
        },
      },
      legend: {
        ...standardLegend(theme),
        formatter: (name: string) => allLabels[name] ?? name,
      },
      xAxis,
      yAxis: valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
      series,
    }
  }

  if (view === 'diff') {
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = params as { name: string; value: number }[]
          if (!Array.isArray(ps) || !ps[0]) return ''
          const v = ps[0].value
          return `${ps[0].name}日<br/>${allLabels['diff']}: ${v != null ? toCommaYen(v) : '-'}`
        },
      },
      xAxis,
      yAxis: valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
      series: [
        {
          type: 'bar' as const,
          data: (chartData as unknown as Record<string, unknown>[]).map((d) => {
            const entry = d as unknown as ChartDataPoint
            return {
              value: entry.diff,
              itemStyle: {
                color:
                  entry.diff == null
                    ? 'transparent'
                    : entry.diff >= 0
                      ? theme.chart.barPositive
                      : theme.chart.barNegative,
                opacity: 0.7,
                borderRadius: [2, 2, 0, 0],
              },
            }
          }),
          barMaxWidth: 16,
          markLine: {
            data: [{ yAxis: 0 }],
            lineStyle: { color: theme.colors.border, width: 1 },
            symbol: 'none',
            label: { show: false },
          },
        },
      ],
    }
  }

  if (view === 'rate') {
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = params as { name: string; value: number }[]
          if (!Array.isArray(ps) || !ps[0]) return ''
          const v = ps[0].value
          return `${ps[0].name}日<br/>${allLabels['achieveRate']}: ${v != null ? `${v.toFixed(1)}%` : '-'}`
        },
      },
      xAxis,
      yAxis: percentYAxis(theme),
      series: [
        {
          name: 'achieveRate',
          type: 'line' as const,
          data: chartData.map((d) => d.achieveRate),
          lineStyle: { color: theme.colors.palette.primary, width: 2.5 },
          itemStyle: { color: theme.colors.palette.primary },
          symbol: 'none',
          connectNulls: true,
          emphasis: {
            itemStyle: {
              color: theme.colors.palette.primary,
              borderColor: theme.colors.bg2,
              borderWidth: 2,
            },
          },
          markLine: {
            data: [
              {
                yAxis: 100,
                label: {
                  formatter: '100%',
                  position: 'end' as const,
                  fontSize: chartFontSize.axis,
                  fontFamily: theme.typography.fontFamily.mono,
                  color: theme.chart.barPositive,
                },
              },
            ],
            lineStyle: { color: theme.chart.barPositive, type: 'dashed' as const, width: 1.5 },
            symbol: 'none',
          },
        },
      ],
      legend: {
        ...standardLegend(theme),
        formatter: (name: string) => allLabels[name] ?? name,
      },
    }
  }

  if (view === 'area') {
    const series: EChartsOption['series'] = []
    if (showBudget) {
      series.push({
        name: 'budgetCum',
        type: 'line' as const,
        data: chartData.map((d) => d.budgetCum),
        lineStyle: { color: theme.chart.budget, width: 2, type: 'dashed' },
        itemStyle: { color: theme.chart.budget },
        areaStyle: { color: theme.chart.budget, opacity: 0.1 },
        symbol: 'none',
      })
    }
    series.push({
      name: 'actualCum',
      type: 'line' as const,
      data: chartData.map((d) => d.actualCum),
      lineStyle: { color: theme.chart.barPositive, width: 2.5 },
      itemStyle: { color: theme.chart.barPositive },
      areaStyle: { color: theme.chart.barPositive, opacity: 0.15 },
      symbol: 'none',
      emphasis: {
        itemStyle: {
          color: theme.chart.barPositive,
          borderColor: theme.colors.bg2,
          borderWidth: 2,
        },
      },
      markLine:
        showBudget && budget > 0
          ? {
              data: [
                {
                  yAxis: budget,
                  label: {
                    formatter: `月間予算 ${fmt(budget)}`,
                    position: 'end' as const,
                    fontSize: chartFontSize.axis,
                    fontFamily: theme.typography.fontFamily.mono,
                    color: theme.colors.palette.warningDark,
                  },
                },
              ],
              lineStyle: {
                color: theme.colors.palette.warningDark,
                type: 'dashed' as const,
                width: 1.5,
              },
              symbol: 'none',
            }
          : undefined,
    })
    if (showPrevYearSeries) {
      series.push({
        name: 'prevYearCum',
        type: 'line' as const,
        data: chartData.map((d) => d.prevYearCum ?? null),
        lineStyle: { color: theme.chart.previousYear, width: 2, type: 'dashed' },
        itemStyle: { color: theme.chart.previousYear },
        areaStyle: { color: theme.chart.previousYear, opacity: 0.08 },
        symbol: 'none',
        connectNulls: true,
      })
    }
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = params as { name: string; seriesName: string; value: number }[]
          if (!Array.isArray(ps) || ps.length === 0) return ''
          let html = `${ps[0].name}日`
          for (const p of ps) {
            const label = allLabels[p.seriesName] ?? p.seriesName
            html += `<br/>${label}: ${toCommaYen(p.value)}`
          }
          return html
        },
      },
      legend: {
        ...standardLegend(theme),
        formatter: (name: string) => allLabels[name] ?? name,
      },
      xAxis,
      yAxis: valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
      series,
    }
  }

  // prevYearDiff view
  const prevYearDiffSeries: EChartsOption['series'] = [
    {
      name: 'budgetDiff',
      type: 'bar' as const,
      data: (chartData as unknown as Record<string, unknown>[]).map((d) => {
        const entry = d as unknown as ChartDataPoint
        return {
          value: entry.budgetDiff,
          itemStyle: {
            color:
              entry.budgetDiff == null
                ? 'transparent'
                : entry.budgetDiff >= 0
                  ? theme.chart.barPositive
                  : theme.chart.barNegative,
            opacity: entry.budgetDiff != null ? 0.7 : 0,
            borderRadius: [3, 3, 0, 0],
          },
        }
      }),
      barMaxWidth: hasPrevYearDiff ? 12 : 18,
    },
  ]
  if (hasPrevYearDiff) {
    prevYearDiffSeries.push({
      name: 'prevYearDiff',
      type: 'line' as const,
      data: chartData.map((d) => d.prevYearDiff),
      lineStyle: { color: theme.colors.palette.primary, width: 2.5 },
      itemStyle: { color: theme.colors.palette.primary },
      symbol: 'none',
      connectNulls: true,
    })
  }
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const ps = params as { name: string; seriesName: string; value: number }[]
        if (!Array.isArray(ps) || ps.length === 0) return ''
        let html = `${ps[0].name}日`
        for (const p of ps) {
          const label = allLabels[p.seriesName] ?? p.seriesName
          html += `<br/>${label}: ${p.value != null ? toCommaYen(p.value) : '-'}`
        }
        return html
      },
    },
    legend: {
      ...standardLegend(theme),
      formatter: (name: string) => allLabels[name] ?? name,
    },
    xAxis,
    yAxis: valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
    series: prevYearDiffSeries,
  }
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
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const [view, setView] = useState<BudgetViewType>('line')
  const totalDaysForSlider = daysInMonth ?? data.length
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(totalDaysForSlider)
  const hasPrevYear = showPrevYear || data.some((d) => d.prevYearCum != null && d.prevYearCum > 0)

  // ── 比較モード ──
  const [compareMode, setCompareMode] = useState<CompareMode>('budgetVsActual')
  const availableViews = VIEWS_BY_COMPARE[compareMode]

  // 比較モード変更時、現在のビューが利用不可なら line にフォールバック
  const effectiveView = availableViews.includes(view) ? view : 'line'

  const showBudget = compareMode !== 'currentVsPrev'
  const showPrevYearSeries = compareMode !== 'budgetVsActual' && hasPrevYear

  // 最新の実績データを取得
  const latestWithSales = [...data].reverse().find((d) => d.actualCum > 0)
  const currentActual = latestWithSales?.actualCum ?? 0
  const currentBudgetCum = latestWithSales?.budgetCum ?? 0
  const currentDay = latestWithSales?.day ?? 0

  // 達成率（対予算累計）
  const progressRate = currentBudgetCum > 0 ? currentActual / currentBudgetCum : 0
  // 着地見込み
  const totalDays = daysInMonth ?? data.length
  const effectiveSalesDays = salesDays ?? currentDay
  const avgDaily = effectiveSalesDays > 0 ? currentActual / effectiveSalesDays : 0
  const remainingDays = totalDays - currentDay
  const projected = currentActual + avgDaily * remainingDays
  const projectedAchievement = budget > 0 ? projected / budget : 0

  // 色分け: >=100% 緑, >=90% 黄, <90% 赤
  const getStatusColor = (rate: number) => {
    if (rate >= 1.0) return ct.colors.success
    if (rate >= 0.9) return ct.colors.warning
    return ct.colors.danger
  }

  const paceColor = getStatusColor(progressRate)
  const projColor = getStatusColor(projectedAchievement)

  // 前年累計を計算（prevYearDiff ビュー用）
  const prevYearCumMap = useMemo(() => {
    const map = new Map<number, number>()
    if (prevYearDaily) {
      let pCum = 0
      const days = daysInMonth ?? data.length
      for (let d = 1; d <= days; d++) {
        pCum += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
        map.set(d, pCum)
      }
    }
    return map
  }, [prevYearDaily, daysInMonth, data.length, year, month])

  const hasPrevYearDiff =
    prevYearCumMap.size > 0 && (prevYearCumMap.get(prevYearCumMap.size) ?? 0) > 0

  // 差分・達成率を含む拡張データ
  const chartData = useMemo(
    () =>
      [...data]
        .map((d) => ({
          ...d,
          diff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
          achieveRate:
            d.budgetCum > 0 && d.actualCum > 0 ? (d.actualCum / d.budgetCum) * 100 : null,
          budgetDiff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
          prevYearDiff:
            hasPrevYearDiff && d.actualCum > 0
              ? d.actualCum - (prevYearCumMap.get(d.day) ?? 0)
              : null,
        }))
        .filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [data, rangeStart, rangeEnd, hasPrevYearDiff, prevYearCumMap],
  )

  const chartTitle = COMPARE_TITLES[compareMode]?.[effectiveView] ?? VIEW_TITLES[effectiveView]

  // 前年同曜日の累計最新値（サマリー表示用）
  const latestPrevYearCum = latestWithSales?.prevYearCum ?? null
  const prevYearDiffAmt = latestPrevYearCum != null ? currentActual - latestPrevYearCum : null
  const prevYearGrowth =
    latestPrevYearCum != null && latestPrevYearCum > 0
      ? ((currentActual - latestPrevYearCum) / latestPrevYearCum) * 100
      : null

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
    <Wrapper aria-label="予算実績比較チャート">
      <HeaderRow>
        <Title>{chartTitle}</Title>
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
      </HeaderRow>
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
              <MetricValue $color={prevYearDiffAmt >= 0 ? ct.colors.success : ct.colors.danger}>
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
      <DualPeriodSlider
        min={1}
        max={totalDaysForSlider}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </Wrapper>
  )
})
