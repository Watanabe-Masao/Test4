/**
 * 売上×CV二軸グラフビュー (ECharts) — CvTimeSeriesChart のサブコンポーネント
 * @responsibility R:unclassified
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
  readonly fmtCurrency: (v: number | null) => string
}

export function CvSalesCvView({ data, topCodes, categoryNames, fmtCurrency }: Props) {
  const theme = useTheme() as AppTheme

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.dateKey as string)
    const series: EChartsOption['series'] = []

    topCodes.forEach((code, i) => {
      series.push({
        name: `${categoryNames.get(code) ?? code} (売上)`,
        type: 'bar',
        yAxisIndex: 0,
        stack: 'sales',
        data: data.map((d) => (d[`sales_${code}`] as number) ?? 0),
        itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], opacity: 0.3 },
      })
    })

    topCodes.forEach((code, i) => {
      series.push({
        name: `${categoryNames.get(code) ?? code} (CV)`,
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => (d[`cv_${code}`] as number) ?? null),
        ...lineDefaults({ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }),
        connectNulls: true,
      })
    })

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: categoryXAxis(dates, theme),
      yAxis: [
        {
          ...valueYAxis(theme, { formatter: (v: number) => fmtCurrency(v) }),
          name: '売上',
          nameLocation: 'middle',
          nameGap: 50,
        },
        {
          ...valueYAxis(theme, { position: 'right', showSplitLine: false, min: 0 }),
          name: 'CV',
          nameLocation: 'middle',
          nameGap: 40,
        },
      ],
      series,
    }
  }, [data, topCodes, categoryNames, fmtCurrency, theme])

  return <EChart option={option} height={300} ariaLabel="売上×CV二軸グラフ" />
}
