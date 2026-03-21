/**
 * カテゴリベンチマーク — サブビュー (ECharts)
 *
 * ChartView / TableView / MapView / TrendView
 * 各ビューは1コンポーネント = 1チャートでシンプルにつなぎ合わせ。
 */
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { CategoryBenchmarkScore, CategoryTrendPoint } from '@/application/hooks/useDuckDBQuery'
import { toPct } from './chartTheme'
import { EmptyState } from '@/presentation/components/common/layout'
import { chartFontSize } from '@/presentation/theme/tokens'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend, toCommaYen } from './echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from './builders'
import {
  DataTable,
  Th,
  Td,
  TypeBadge,
  MapSection,
  MapLegend,
  LegendItem,
  MapQuadrantLabel,
} from './CategoryBenchmarkChart.styles'
import {
  TYPE_LABELS,
  TYPE_COLORS,
  TREND_COLORS,
  indexColor,
  computeChartHeight,
  buildScatterData,
  buildTrendPivotData,
  buildNameMap,
  getMetricDisplayName,
} from './CategoryBenchmarkChart.vm'

// ── ChartView (横棒グラフ) ──

export function ChartView({
  scores,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  fmt: (v: number) => string
}) {
  const theme = useTheme() as AppTheme
  const chartHeight = computeChartHeight(scores.length)

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 80, right: 40, top: 4, bottom: 4, containLabel: false },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data: { value: number; name: string } }
          const s = scores.find((sc) => sc.name === p.data.name)
          if (!s) return ''
          return (
            `<strong>${s.name}</strong><br/>` +
            `Index: ${s.index.toFixed(1)}<br/>` +
            `安定度: ${toPct(s.stability)}<br/>` +
            `売上: ${fmt(s.totalSales)}<br/>` +
            `タイプ: ${TYPE_LABELS[s.productType]}`
          )
        },
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: theme.colors.text3, fontSize: chartFontSize.axis },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: scores.map((s) => s.name),
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          width: 70,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: scores.map((s) => ({
            value: s.index,
            name: s.name,
            itemStyle: { color: indexColor(s.index), borderRadius: [0, 4, 4, 0] },
          })),
        },
      ],
    }),
    [scores, fmt, theme],
  )

  return <EChart option={option} height={chartHeight} ariaLabel="カテゴリベンチマーク棒グラフ" />
}

// ── TableView (テーブル — Recharts なし) ──

export function TableView({
  scores,
  fmt,
  metricLabel,
}: {
  scores: readonly CategoryBenchmarkScore[]
  fmt: (v: number) => string
  metricLabel: string
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>カテゴリ</Th>
          <Th>Index</Th>
          <Th>安定度</Th>
          <Th>{getMetricDisplayName(metricLabel as Parameters<typeof getMetricDisplayName>[0])}</Th>
          <Th>タイプ</Th>
        </tr>
      </thead>
      <tbody>
        {scores.map((s) => (
          <tr key={s.code}>
            <Td>{s.name}</Td>
            <Td style={{ color: indexColor(s.index), fontWeight: 600 }}>{s.index.toFixed(1)}</Td>
            <Td>{toPct(s.stability)}</Td>
            <Td>{fmt(s.totalSales)}</Td>
            <Td>
              <TypeBadge $type={s.productType}>{TYPE_LABELS[s.productType]}</TypeBadge>
            </Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  )
}

// ── MapView (散布図) ──

export function MapView({ scores }: { scores: readonly CategoryBenchmarkScore[] }) {
  const theme = useTheme() as AppTheme
  const scatterData = buildScatterData(scores)

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 50, right: 30, top: 20, bottom: 40, containLabel: false },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as {
            data?: { value?: [number, number, number]; name?: string; productType?: string }
          }
          if (!p?.data?.value || !Array.isArray(p.data.value)) return ''
          const [x, y, sales] = p.data.value
          return (
            `<strong>${p.data.name ?? ''}</strong><br/>` +
            `Index: ${x.toFixed(1)}<br/>` +
            `安定度: ${y.toFixed(1)}%<br/>` +
            `売上: ${toCommaYen(sales)}<br/>` +
            `タイプ: ${TYPE_LABELS[(p.data.productType ?? '') as keyof typeof TYPE_LABELS] ?? ''}`
          )
        },
      },
      xAxis: {
        type: 'value',
        name: 'Index (構成比)',
        nameLocation: 'center',
        nameGap: 25,
        max: 100,
        min: 0,
        axisLabel: { color: theme.colors.text3, fontSize: chartFontSize.axis },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      },
      yAxis: valueYAxis(theme, { max: 100, min: 0 }),
      series: [
        {
          type: 'scatter',
          data: scatterData.map((s) => ({
            value: [s.x, s.y, s.totalSales],
            name: s.name,
            productType: s.productType,
            symbolSize: Math.max(8, Math.min(30, Math.sqrt(s.totalSales / 10000))),
            itemStyle: { color: TYPE_COLORS[s.productType], opacity: 0.8 },
          })),
        },
      ],
    }),
    [scatterData, theme],
  )

  return (
    <MapSection>
      <div style={{ position: 'relative' }}>
        <MapQuadrantLabel style={{ top: 4, left: 90 }}>普通</MapQuadrantLabel>
        <MapQuadrantLabel style={{ top: 4, right: 30 }}>主力</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, left: 90 }}>不安定</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, right: 30 }}>地域特化</MapQuadrantLabel>
        <EChart option={option} height={280} ariaLabel="カテゴリポジショニングマップ" />
      </div>
      <MapLegend>
        <LegendItem $color={TYPE_COLORS.flagship}>主力（高Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.regional}>地域特化（高Index・低安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.standard}>普通（低Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.unstable}>不安定（低Index・低安定度）</LegendItem>
      </MapLegend>
    </MapSection>
  )
}

// ── TrendView (折れ線グラフ) ──

export function TrendView({
  trendData,
  topCodes,
  scores,
}: {
  trendData: readonly CategoryTrendPoint[]
  topCodes: readonly string[]
  scores: readonly CategoryBenchmarkScore[]
}) {
  const theme = useTheme() as AppTheme
  const nameMap = useMemo(() => buildNameMap(scores), [scores])
  const chartData = useMemo(() => buildTrendPivotData(trendData), [trendData])

  const option = useMemo<EChartsOption>(() => {
    const dates = chartData.map((d) => (d.dateKey as string).slice(5))
    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: categoryXAxis(dates, theme),
      yAxis: valueYAxis(theme),
      series: topCodes.map((code, i) => ({
        name: nameMap.get(code) ?? code,
        type: 'line' as const,
        data: chartData.map((d) => (d[code] as number) ?? null),
        ...lineDefaults({ color: TREND_COLORS[i % TREND_COLORS.length], width: 2 }),
        connectNulls: true,
      })),
    }
  }, [chartData, topCodes, nameMap, theme])

  if (chartData.length === 0) {
    return <EmptyState>トレンドデータがありません</EmptyState>
  }

  return <EChart option={option} height={320} ariaLabel="カテゴリトレンドチャート" />
}
