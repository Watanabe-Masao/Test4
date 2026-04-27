/**
 * BudgetVsActualChart — ECharts オプションビルダー
 *
 * 純粋関数のみ。コンポーネント本体から分離（C1: 1ファイル = 1変更理由）。
 *
 * @responsibility R:unclassified
 */
import type { AppTheme } from '@/presentation/theme/theme'
import type { EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend, toCommaYen } from './echartsOptionBuilders'
import {
  categoryXAxis,
  valueYAxis,
  percentYAxis,
  lineDefaults,
  areaDefaults,
  zeroBaseline,
} from './builders'
import { toAxisYen } from './chartTheme'
import { chartFontSize } from '@/presentation/theme/tokens'
import type { BudgetViewType } from './BudgetVsActualChart.styles'

export interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
  prevYearCum?: number | null
}

export interface ChartDataPoint extends DataPoint {
  diff: number | null
  achieveRate: number | null
  budgetDiff: number | null
  prevYearDiff: number | null
}

export const allLabels: Record<string, string> = {
  actualCum: '実績累計',
  budgetCum: '予算累計',
  prevYearCum: '比較期累計',
  diff: '予算差異',
  achieveRate: '達成率(%)',
  budgetDiff: '予算差（累計）',
  prevYearDiff: '比較期差（累計）',
}

export function buildOption(
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
  const xAxis = categoryXAxis(days, theme)

  if (view === 'line') {
    const series: EChartsOption['series'] = [
      {
        name: 'actualCum',
        type: 'line' as const,
        data: chartData.map((d) => d.actualCum),
        ...lineDefaults({ color: theme.chart.barPositive, width: 2.5 }),
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
        ...lineDefaults({ color: theme.chart.budget, dashed: true }),
      })
    }
    if (showPrevYearSeries) {
      series.push({
        name: 'prevYearCum',
        type: 'line' as const,
        data: chartData.map((d) => d.prevYearCum ?? null),
        ...lineDefaults({ color: theme.chart.previousYear, dashed: true, width: 1.5 }),
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
          markLine: zeroBaseline(theme),
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
          ...lineDefaults({ color: theme.colors.palette.primary, width: 2.5 }),
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
        ...areaDefaults({ color: theme.chart.budget, subtle: true }),
        lineStyle: { color: theme.chart.budget, width: 2, type: 'dashed' },
      })
    }
    series.push({
      name: 'actualCum',
      type: 'line' as const,
      data: chartData.map((d) => d.actualCum),
      ...areaDefaults({ color: theme.chart.barPositive }),
      lineStyle: { color: theme.chart.barPositive, width: 2.5 },
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
        ...areaDefaults({ color: theme.chart.previousYear, subtle: true }),
        lineStyle: { color: theme.chart.previousYear, width: 2, type: 'dashed' },
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
      ...lineDefaults({ color: theme.colors.palette.primary, width: 2.5 }),
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
