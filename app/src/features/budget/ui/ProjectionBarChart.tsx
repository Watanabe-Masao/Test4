/**
 * ProjectionBarChart — 残期間の日別予測売上 (ECharts bar)
 *
 * `computeDailyProjection` が返す配列を日付ラベル付き bar chart として描画する。
 * mode=yoy/ach は budget 比で按分、mode=dow は base × pct/100 を直接プロット。
 *
 * プロトタイプ App.jsx の ProjectionBarChart 相当。
 *
 * @responsibility R:chart-view
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  barDefaults,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  yenYAxis,
} from '@/presentation/components/charts/builders'
import { toCommaYen } from '@/presentation/components/charts/echartsOptionBuilders'

interface Props {
  /** 残期間の日別予測配列 (length = daysInMonth - currentDay) */
  readonly dailyProjection: readonly number[]
  /** 基準日 (1-based)。日ラベル計算用 (currentDay+1 から) */
  readonly currentDay: number
  /** 月の日数 (ラベル計算用) */
  readonly daysInMonth: number
  readonly height?: number
}

function buildOption(
  dailyProjection: readonly number[],
  currentDay: number,
  theme: AppTheme,
): EChartsOption {
  const days = dailyProjection.map((_, i) => String(currentDay + i + 1))
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }[]
        if (!Array.isArray(p) || !p[0]) return ''
        return `${p[0].name}日<br/>予測売上: ${toCommaYen(p[0].value ?? 0)}`
      },
    },
    xAxis: categoryXAxis(days, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '残期間予測',
        type: 'bar',
        data: dailyProjection.map((v) => v),
        ...barDefaults({ color: theme.colors.palette.primary }),
      },
    ],
  }
}

export const ProjectionBarChart = memo(function ProjectionBarChart({
  dailyProjection,
  currentDay,
  height = 240,
}: Props) {
  const theme = useTheme() as AppTheme
  const option = useMemo(
    () => buildOption(dailyProjection, currentDay, theme),
    [dailyProjection, currentDay, theme],
  )

  if (dailyProjection.length === 0) {
    return (
      <ChartCard title="残期間 予測売上 (日別)" ariaLabel="残期間予測">
        <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.6 }}>
          残期間がありません（月末到達）
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="残期間 予測売上 (日別)" ariaLabel="残期間予測">
      <EChart option={option} height={height} ariaLabel="残期間予測バーチャート" />
    </ChartCard>
  )
})
