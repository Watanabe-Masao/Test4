/**
 * 部門KPI月別トレンドチャート (ECharts)
 *
 * パイプライン:
 *   QueryHandler → DeptTrendChartLogic.ts → ECharts option → EChart
 *
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBDeptKpiTrend 直接 import）
 * @responsibility R:unclassified
 */
import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useDeptTrendChartPlan,
  type DeptKpiTrendInput,
} from '@/application/hooks/plans/useDeptTrendChartPlan'
import { buildDeptTrendData, type DeptTrendChartPoint } from './DeptTrendChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
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
import { categoryXAxis, valueYAxis } from './builders'
import { DeptSelector, DeptChip } from './DeptTrendChart.styles'

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly loadedMonthCount: number
  readonly year: number
  readonly month: number
}

function buildOption(
  chartData: readonly DeptTrendChartPoint[],
  visibleDepts: readonly [string, string][],
  theme: AppTheme,
): EChartsOption {
  const labels = chartData.map((d) => d.label)
  const colors = theme.chart.series

  const series: EChartsOption['series'] = []
  visibleDepts.forEach(([code, name], i) => {
    series.push({
      name: `${name} 売上`,
      type: 'bar',
      yAxisIndex: 0,
      data: chartData.map((d) => (d[`sales_${code}`] as number) ?? null),
      itemStyle: { color: colors[i % colors.length], opacity: 0.4 },
      barWidth: 8,
    })
    series.push({
      name: `${name} 粗利率`,
      type: 'line',
      yAxisIndex: 1,
      data: chartData.map((d) => (d[`gpRate_${code}`] as number) ?? null),
      lineStyle: { color: colors[i % colors.length], width: 2 },
      itemStyle: { color: colors[i % colors.length] },
      symbolSize: 6,
      connectNulls: true,
    })
  })

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as {
          seriesName: string
          value: number | null
          color: string
          name: string
        }[]
        if (!Array.isArray(items)) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${items[0]?.name ?? ''}</div>`
        const rows = items
          .filter((item) => item.value != null)
          .map((item) => {
            const val = item.seriesName.includes('粗利率')
              ? `${item.value}%`
              : toCommaYen(item.value!)
            return `<div><span style="color:${item.color}">${item.seriesName}</span>: ${val}</div>`
          })
          .join('')
        return header + rows
      },
    },
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(labels, theme),
    yAxis: [
      yenYAxis(theme) as Record<string, unknown>,
      valueYAxis(theme, {
        formatter: (v: number) => `${v}%`,
        position: 'right',
        showSplitLine: false,
      }) as Record<string, unknown>,
    ],
    series,
  }
}

export const DeptTrendChart = memo(function DeptTrendChart({
  queryExecutor,
  loadedMonthCount,
  year,
  month,
}: Props) {
  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  const yearMonths = useMemo(() => {
    const months: { year: number; month: number }[] = []
    for (let i = 11; i >= 0; i--) {
      let m = month - i
      let y = year
      while (m <= 0) {
        m += 12
        y -= 1
      }
      months.push({ year: y, month: m })
    }
    return months
  }, [year, month])

  const input = useMemo<DeptKpiTrendInput | null>(() => ({ yearMonths }), [yearMonths])

  const { data: output, isLoading, error } = useDeptTrendChartPlan(queryExecutor, input)

  const trendData = output?.records ?? null

  const { chartData, deptNames } = useMemo(
    () =>
      trendData
        ? buildDeptTrendData(trendData, selectedDept)
        : { chartData: [], deptNames: new Map<string, string>() },
    [trendData, selectedDept],
  )

  const deptEntries = useMemo(() => [...deptNames.entries()], [deptNames])
  const visibleDepts = useMemo(
    () => (selectedDept ? deptEntries.filter(([code]) => code === selectedDept) : deptEntries),
    [selectedDept, deptEntries],
  )

  const option = useMemo(
    () => buildOption(chartData, visibleDepts, theme),
    [chartData, visibleDepts, theme],
  )

  if (error) {
    return (
      <ChartCard title="部門別KPIトレンド">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !trendData) {
    return (
      <ChartCard title="部門別KPIトレンド">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!queryExecutor || loadedMonthCount < 2 || chartData.length === 0) {
    return (
      <ChartCard title="部門別KPIトレンド">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="部門別KPIトレンド"
      subtitle={`粗利率（線）・売上実績（棒）の月次推移 | ${loadedMonthCount}ヶ月分ロード済み`}
    >
      {deptEntries.length > 1 && (
        <DeptSelector>
          <DeptChip $active={selectedDept === null} onClick={() => setSelectedDept(null)}>
            全部門
          </DeptChip>
          {deptEntries.map(([code, name]) => (
            <DeptChip
              key={code}
              $active={selectedDept === code}
              onClick={() => setSelectedDept((prev) => (prev === code ? null : code))}
            >
              {name}
            </DeptChip>
          ))}
        </DeptSelector>
      )}

      <EChart option={option} height={300} ariaLabel="部門別KPIトレンドチャート" />
    </ChartCard>
  )
})
