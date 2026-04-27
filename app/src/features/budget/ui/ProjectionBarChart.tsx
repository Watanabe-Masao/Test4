/**
 * ProjectionBarChart — ④ 残期間シミュレーター用 多系列棒グラフ
 *
 * 仕様書 §08 に準拠:
 * - 経過日 (1〜currentDay): 緑バー (実績)
 * - 残期間 (currentDay+1〜末日): オレンジバー (予測)
 * - 予算バー: グレー、全日重ね
 * - 7日移動平均ライン: 当期 / 予算 / 前年 の 3 本
 *
 * @responsibility R:unclassified
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { calculatePartialMovingAverage } from '@/domain/calculations/utils'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  categoryXAxis,
  lineDefaults,
  standardGrid,
  standardLegend,
  standardTooltip,
  yenYAxis,
} from '@/presentation/components/charts/builders'
import { toCommaYen } from '@/presentation/components/charts/echartsOptionBuilders'

interface Props {
  /** シナリオ (daysInMonth / dailyBudget / lyDaily / actualDaily を参照) */
  readonly scenario: SimulatorScenario
  /** 残期間の日別予測 (length = daysInMonth - currentDay) */
  readonly dailyProjection: readonly number[]
  /** 基準日 (1-based)。1..currentDay は経過バー、currentDay+1..末日は予測バー */
  readonly currentDay: number
  readonly height?: number
}

function buildOption(
  scenario: SimulatorScenario,
  dailyProjection: readonly number[],
  currentDay: number,
  theme: AppTheme,
): EChartsOption {
  const { daysInMonth, dailyBudget, lyDaily, actualDaily } = scenario
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1))

  // 経過実績バー: 1..currentDay は actualDaily、残りは null
  const elapsedBars = Array.from({ length: daysInMonth }, (_, i) =>
    i < currentDay ? (actualDaily[i] ?? 0) : null,
  )
  // 残期間予測バー: currentDay+1..末日 は dailyProjection、手前は null
  const projBars = Array.from({ length: daysInMonth }, (_, i) =>
    i >= currentDay ? (dailyProjection[i - currentDay] ?? null) : null,
  )

  // 結合系列: 経過実績 + 残期間予測 を 1 本の値として MA 計算に使う
  const combined = Array.from({ length: daysInMonth }, (_, i) =>
    i < currentDay ? (actualDaily[i] ?? 0) : (dailyProjection[i - currentDay] ?? 0),
  )

  const maCombined = calculatePartialMovingAverage(combined, 7).map((v) => (v == null ? null : v))
  const maBudget = calculatePartialMovingAverage(dailyBudget, 7).map((v) => (v == null ? null : v))
  const maLy = calculatePartialMovingAverage(lyDaily, 7).map((v) => (v == null ? null : v))

  // 当期 (経過実績 + 残期間予測) は同一 stack で 1 本の bar に統合。
  // 予算は別系列として 当期 bar の隣に横並び (grouped bar)。
  const series: NonNullable<EChartsOption['series']> = [
    {
      name: '経過実績',
      type: 'bar',
      stack: 'current',
      data: elapsedBars,
      itemStyle: {
        color: theme.colors.palette.positive,
        borderRadius: [2, 2, 0, 0],
      },
      barMaxWidth: 14,
    },
    {
      name: '残期間予測',
      type: 'bar',
      stack: 'current',
      data: projBars,
      itemStyle: {
        color: theme.colors.palette.warningDark,
        borderRadius: [2, 2, 0, 0],
      },
      barMaxWidth: 14,
    },
    {
      name: '予算',
      type: 'bar',
      data: dailyBudget.map((v) => v),
      itemStyle: {
        color: theme.colors.text3,
        opacity: 0.55,
        borderRadius: [2, 2, 0, 0],
      },
      barMaxWidth: 14,
    },
    {
      name: '当期 7日移動平均',
      type: 'line',
      data: maCombined,
      ...lineDefaults({ color: theme.colors.palette.primary, width: 2 }),
      connectNulls: true,
      z: 5,
    },
    {
      name: '予算 7日移動平均',
      type: 'line',
      data: maBudget,
      ...lineDefaults({ color: theme.colors.text3, dashed: true, width: 1.5 }),
      connectNulls: true,
      z: 4,
    },
    {
      name: '前年 7日移動平均',
      type: 'line',
      data: maLy,
      ...lineDefaults({ color: theme.colors.palette.warning, dashed: true, width: 1.5 }),
      connectNulls: true,
      z: 4,
    },
  ]

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const arr = params as { name: string; value: number; seriesName: string }[]
        if (!Array.isArray(arr) || arr.length === 0) return ''
        const head = `${arr[0].name}日`
        const rows = arr
          .filter((p) => p.value != null)
          .map((p) => `${p.seriesName}: ${toCommaYen(p.value)}`)
          .join('<br/>')
        return `${head}<br/>${rows}`
      },
    },
    legend: standardLegend(theme),
    xAxis: categoryXAxis(days, theme),
    yAxis: yenYAxis(theme),
    series,
  }
}

export const ProjectionBarChart = memo(function ProjectionBarChart({
  scenario,
  dailyProjection,
  currentDay,
  height = 320,
}: Props) {
  const theme = useTheme() as AppTheme
  const option = useMemo(
    () => buildOption(scenario, dailyProjection, currentDay, theme),
    [scenario, dailyProjection, currentDay, theme],
  )

  return (
    <ChartCard
      title="月内 日次推移（経過実績 + 残期間予測 vs 予算・前年）"
      ariaLabel="月末着地予測"
    >
      <EChart option={option} height={height} ariaLabel="月末着地予測チャート" />
    </ChartCard>
  )
})
