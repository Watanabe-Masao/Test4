/**
 * CV折れ線グラフビュー (ECharts) — CvTimeSeriesChart のサブコンポーネント
 * @responsibility R:chart-view
 */
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { CATEGORY_COLORS } from './ChartParts'
import { EChart, type EChartsOption } from './EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
  categoryXAxis,
  valueYAxis,
  lineDefaults,
} from './builders'

interface Props {
  readonly data: readonly Record<string, number | string>[]
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly showCv: boolean
  readonly showPi: boolean
}

export function CvLineView({ data, topCodes, categoryNames, showCv, showPi }: Props) {
  const theme = useTheme() as AppTheme

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.dateKey as string)
    const yAxes: Record<string, unknown>[] = []
    const series: EChartsOption['series'] = []

    if (showCv) {
      yAxes.push({
        ...valueYAxis(theme, { min: 0 }),
        name: 'CV',
        nameLocation: 'middle',
        nameGap: 40,
      })
      topCodes.forEach((code, i) => {
        series.push({
          name: categoryNames.get(code) ?? code,
          type: 'line',
          yAxisIndex: 0,
          data: data.map((d) => (d[`cv_${code}`] as number) ?? null),
          ...lineDefaults({ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }),
          connectNulls: true,
        })
      })
    }

    if (showPi) {
      yAxes.push({
        ...valueYAxis(theme, { position: 'right', showSplitLine: false, min: 0 }),
        name: 'PI',
        nameLocation: 'middle',
        nameGap: 40,
      })
      const piAxisIdx = showCv ? 1 : 0
      topCodes.forEach((code, i) => {
        series.push({
          name: `${categoryNames.get(code) ?? code} (PI)`,
          type: 'line',
          yAxisIndex: piAxisIdx,
          data: data.map((d) => (d[`pi_${code}`] as number) ?? null),
          ...lineDefaults({
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            width: 1.5,
            dashed: true,
          }),
          connectNulls: true,
        })
      })
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: categoryXAxis(dates, theme),
      yAxis: yAxes.length > 0 ? (yAxes as EChartsOption['yAxis']) : { type: 'value' },
      series,
    }
  }, [data, topCodes, categoryNames, showCv, showPi, theme])

  return <EChart option={option} height={300} ariaLabel="CV折れ線グラフ" />
}
