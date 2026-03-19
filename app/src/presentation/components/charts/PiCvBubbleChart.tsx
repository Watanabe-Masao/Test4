/**
 * PI-CV マップ（バブルチャート） (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  buildCategoryBenchmarkScores,
  type ProductType,
} from '@/application/hooks/useDuckDBQuery'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardTooltip } from './echartsOptionBuilders'
import { LegendRow, LegendItem, QuadrantLabel } from './PiCvBubbleChart.styles'
import { HIERARCHY_LABELS, type HierarchyLevel } from './ChartParts'
import { chartFontSize } from '@/presentation/theme/tokens'

const TYPE_COLORS: Record<ProductType, string> = {
  flagship: '#22c55e',
  regional: '#3b82f6',
  standard: '#9ca3af',
  unstable: '#f97316',
}

type PiMetric = 'salesPi' | 'quantityPi'
type BubbleSizeMetric = 'sales' | 'quantity' | 'none'

function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export const PiCvBubbleChart = memo(function PiCvBubbleChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const [piMetric, setPiMetric] = useState<PiMetric>('salesPi')
  const [bubbleSize, setBubbleSize] = useState<BubbleSizeMetric>('sales')
  const [level, setLevel] = useState<HierarchyLevel>('department')

  const benchmarkResult = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )
  const storeCount = selectedStoreIds.size || 0

  const scores = useMemo(() => {
    if (!benchmarkResult.data || benchmarkResult.data.length === 0) return []
    return buildCategoryBenchmarkScores(benchmarkResult.data, 1, storeCount, piMetric)
  }, [benchmarkResult.data, storeCount, piMetric])

  const scatterData = useMemo(
    () =>
      scores.map((s) => ({
        ...s,
        x: s.avgShare,
        y: s.variance,
        bubbleValue:
          bubbleSize === 'sales' ? s.totalSales : bubbleSize === 'quantity' ? s.scoreSum : 1,
      })),
    [scores, bubbleSize],
  )

  const medians = useMemo(
    () => ({
      piMedian: computeMedian(scatterData.map((d) => d.x)),
      cvMedian: computeMedian(scatterData.map((d) => d.y)),
    }),
    [scatterData],
  )

  const option = useMemo<EChartsOption>(() => {
    let maxPi = 0,
      maxCv = 0
    for (const d of scatterData) {
      if (d.x > maxPi) maxPi = d.x
      if (d.y > maxCv) maxCv = d.y
    }
    maxPi *= 1.15
    maxCv *= 1.15

    return {
      grid: { left: 50, right: 30, top: 20, bottom: 40 },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as {
            data: { value: [number, number]; name: string; productType: string }
          }
          const [x, y] = p.data.value
          return `<strong>${p.data.name}</strong><br/>PI: ${x.toFixed(2)}<br/>CV: ${y.toFixed(2)}`
        },
      },
      xAxis: {
        type: 'value',
        name: `${piMetric === 'salesPi' ? '金額PI' : '数量PI'} (平均)`,
        nameLocation: 'center',
        nameGap: 25,
        max: maxPi,
        min: 0,
        axisLabel: { color: theme.colors.text3, fontSize: chartFontSize.axis },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'CV (変動係数)',
        nameLocation: 'center',
        nameGap: 35,
        max: maxCv,
        min: 0,
        axisLabel: { color: theme.colors.text3, fontSize: chartFontSize.axis },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      },
      series: [
        {
          type: 'scatter',
          data: scatterData.map((s) => ({
            value: [s.x, s.y],
            name: s.name,
            productType: s.productType,
            symbolSize:
              bubbleSize === 'none'
                ? 10
                : Math.max(6, Math.min(30, Math.sqrt(s.bubbleValue / 5000))),
            itemStyle: { color: TYPE_COLORS[s.productType], opacity: 0.75 },
          })),
          markLine: {
            data: [
              {
                xAxis: medians.piMedian,
                lineStyle: { color: theme.colors.text4, type: 'dashed', opacity: 0.5 },
              },
              {
                yAxis: medians.cvMedian,
                lineStyle: { color: theme.colors.text4, type: 'dashed', opacity: 0.5 },
              },
            ],
            symbol: 'none',
            label: { show: false },
          },
        },
      ],
    }
  }, [scatterData, medians, piMetric, bubbleSize, theme])

  if (benchmarkResult.isLoading) {
    return (
      <ChartCard title="PI-CV マップ">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (benchmarkResult.error) {
    return (
      <ChartCard title="PI-CV マップ">
        <ChartError message="データの取得に失敗しました" />
      </ChartCard>
    )
  }
  if (scatterData.length === 0) {
    return (
      <ChartCard title="PI-CV マップ">
        <ChartEmpty message="データがありません" />
      </ChartCard>
    )
  }

  const piLabel = piMetric === 'salesPi' ? '金額PI' : '数量PI'
  const subtitle = `販売効率(${piLabel}) x 店舗ばらつき(CV)${bubbleSize !== 'none' ? ` x ${bubbleSize === 'sales' ? '販売金額' : '販売点数'}` : ''} / ${HIERARCHY_LABELS[level]}別 / ${scores.length}カテゴリ`

  // Inline toolbar (will be unified with Tailwind later)
  const toolbar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.6rem' }}>
      {(['salesPi', 'quantityPi'] as PiMetric[]).map((m) => (
        <button
          key={m}
          onClick={() => setPiMetric(m)}
          style={{
            padding: '2px 8px',
            border: `1px solid ${piMetric === m ? theme.colors.palette.primary : theme.colors.border}`,
            borderRadius: theme.radii.sm,
            background: piMetric === m ? theme.interactive.activeBg : 'transparent',
            color: piMetric === m ? theme.colors.palette.primary : theme.colors.text3,
            cursor: 'pointer',
          }}
        >
          {m === 'salesPi' ? '金額PI' : '数量PI'}
        </button>
      ))}
      {(['sales', 'quantity', 'none'] as BubbleSizeMetric[]).map((m) => (
        <button
          key={m}
          onClick={() => setBubbleSize(m)}
          style={{
            padding: '2px 8px',
            border: `1px solid ${bubbleSize === m ? theme.colors.palette.primary : theme.colors.border}`,
            borderRadius: theme.radii.sm,
            background: bubbleSize === m ? theme.interactive.activeBg : 'transparent',
            color: bubbleSize === m ? theme.colors.palette.primary : theme.colors.text3,
            cursor: 'pointer',
          }}
        >
          {m === 'sales' ? '販売金額' : m === 'quantity' ? '販売点数' : 'なし'}
        </button>
      ))}
      {(Object.keys(HIERARCHY_LABELS) as HierarchyLevel[]).map((l) => (
        <button
          key={l}
          onClick={() => setLevel(l)}
          style={{
            padding: '2px 8px',
            border: `1px solid ${level === l ? theme.colors.palette.primary : theme.colors.border}`,
            borderRadius: theme.radii.sm,
            background: level === l ? theme.interactive.activeBg : 'transparent',
            color: level === l ? theme.colors.palette.primary : theme.colors.text3,
            cursor: 'pointer',
          }}
        >
          {HIERARCHY_LABELS[l]}
        </button>
      ))}
    </div>
  )

  return (
    <ChartCard title="PI-CV マップ" subtitle={subtitle} toolbar={toolbar}>
      <div style={{ position: 'relative' }}>
        <QuadrantLabel style={{ top: 8, left: 90 }}>低PI・高CV</QuadrantLabel>
        <QuadrantLabel style={{ top: 8, right: 30 }}>高PI・高CV</QuadrantLabel>
        <QuadrantLabel style={{ bottom: 30, left: 90 }}>低PI・低CV</QuadrantLabel>
        <QuadrantLabel style={{ bottom: 30, right: 30 }}>高PI・低CV</QuadrantLabel>
        <EChart option={option} height={320} ariaLabel="PI-CVマップ" />
      </div>

      <LegendRow>
        <LegendItem $color={TYPE_COLORS.flagship}>高PI・低CV (主力)</LegendItem>
        <LegendItem $color={TYPE_COLORS.regional}>高PI・高CV (地域特化)</LegendItem>
        <LegendItem $color={TYPE_COLORS.standard}>低PI・低CV (定番)</LegendItem>
        <LegendItem $color={TYPE_COLORS.unstable}>低PI・高CV (不安定)</LegendItem>
      </LegendRow>
    </ChartCard>
  )
})
