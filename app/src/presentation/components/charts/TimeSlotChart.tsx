/**
 * 時間帯別売上チャート
 *
 * 金額(棒) + 点数(点線) の統合チャート、KPIサマリー、比較テーブル、
 * カテゴリ×時間帯ヒートマップを1画面に表示。前年/前週の切り替え対応。
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import { useChartTheme, toComma, toPct } from './chartTheme'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardTooltip } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { formatCoreTime } from './timeSlotUtils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette, chartFontSize } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import {
  Controls,
  TabGroup,
  Tab,
  Grid,
  Card,
  CardLabel,
  CardValue,
  CardSub,
  YoYBadge,
  InsightBar,
  InsightItem,
} from './TimeSlotSalesChart.styles'
import { HierarchySelect, ErrorMsg } from './TimeSlotChart.styles'
import { useDuckDBTimeSlotData } from './useDuckDBTimeSlotData'
import { TimeSlotComparisonTable } from './TimeSlotComparisonTable'
import { CategoryTimeHeatmap } from './CategoryTimeHeatmap'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { EmptyState } from '@/presentation/components/common/layout'

// ── Layout constants (チャート・テーブル・ヒートマップの時間帯列を揃える) ──
const GRID_LEFT = 55
const GRID_RIGHT = 45

// ── 凡例ヘルパー ──

function LegendItem({
  color,
  dashed,
  children,
}: {
  color: string
  dashed?: boolean
  children: React.ReactNode
}) {
  const swatch = dashed ? (
    <span
      style={{
        display: 'inline-block',
        width: 16,
        height: 0,
        borderTop: `2px dashed ${color}`,
        verticalAlign: 'middle',
        marginRight: 4,
      }}
    />
  ) : (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: 2,
        background: color,
        verticalAlign: 'middle',
        marginRight: 4,
      }}
    />
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {swatch}
      {children}
    </span>
  )
}

// ── Props ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDb?: AsyncDuckDB | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

// ── Component ──

export const TimeSlotChart = memo(function TimeSlotChart({
  duckConn,
  duckDb,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const theme = useTheme() as AppTheme
  const ct = useChartTheme()
  const { messages } = useI18n()
  const [detailView, setDetailView] = useState<'table' | 'heatmap'>('table')
  const [heatmapMetric, setHeatmapMetric] = useState<'amount' | 'quantity'>('amount')
  type LineMode = 'quantity' | 'temperature' | 'precipitation'
  const [lineMode, setLineMode] = useState<LineMode>('quantity')

  const d = useDuckDBTimeSlotData({
    duckConn,
    duckDb,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
  })

  const showPrev = d.hasPrev && d.showPrev

  const hours = useMemo(() => d.chartData.map((r) => String(r.hour)), [d.chartData])

  // 天気データを hour→値の Map に変換
  const curWeatherMap = useMemo(() => {
    const m = new Map<number, { temp: number; precip: number }>()
    if (d.curWeatherAvg) {
      for (const w of d.curWeatherAvg) {
        m.set(w.hour, { temp: w.avgTemperature, precip: w.totalPrecipitation })
      }
    }
    return m
  }, [d.curWeatherAvg])
  const prevWeatherMap = useMemo(() => {
    const m = new Map<number, { temp: number; precip: number }>()
    if (d.prevWeatherAvg) {
      for (const w of d.prevWeatherAvg) {
        m.set(w.hour, { temp: w.avgTemperature, precip: w.totalPrecipitation })
      }
    }
    return m
  }, [d.prevWeatherAvg])

  const hasWeatherData = curWeatherMap.size > 0

  // ECharts option for chart view — 金額(棒) + 折れ線（点数 or 天気）
  const chartOption = useMemo<EChartsOption>(() => {
    const barColor = theme.colors.palette.primary
    const qtyColor = theme.colors.palette.cyan

    // ── 棒グラフ（売上金額） ──
    const series: EChartsOption['series'] = [
      {
        name: showPrev ? `${d.curLabel}売上` : '売上金額',
        type: 'bar',
        yAxisIndex: 0,
        data: d.chartData.map((r) => (r as Record<string, unknown>).amount as number),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${barColor}d9` },
              { offset: 1, color: `${barColor}66` },
            ],
          },
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 20,
      },
    ]

    if (showPrev) {
      series.push({
        name: `${d.compLabel}売上`,
        type: 'bar',
        yAxisIndex: 0,
        data: d.chartData.map((r) => ((r as Record<string, unknown>).prevAmount as number) ?? null),
        itemStyle: {
          color: `${theme.colors.palette.slate}80`,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 20,
      })
    }

    // ── 折れ線（lineMode に応じて切替） ──
    const tempColor = palette.warningDark
    const precipColor = palette.infoDark

    if (lineMode === 'quantity') {
      series.push({
        name: showPrev ? `${d.curLabel}点数` : '点数',
        type: 'line',
        yAxisIndex: 1,
        data: d.chartData.map((r) => (r as Record<string, unknown>).quantity as number),
        lineStyle: { color: qtyColor, width: 2, type: 'dashed' },
        itemStyle: { color: qtyColor },
        symbol: 'none',
        smooth: true,
      })
      if (showPrev) {
        series.push({
          name: `${d.compLabel}点数`,
          type: 'line',
          yAxisIndex: 1,
          data: d.chartData.map(
            (r) => ((r as Record<string, unknown>).prevQuantity as number) ?? null,
          ),
          lineStyle: { color: theme.colors.palette.slate, width: 1.5, type: 'dashed' },
          itemStyle: { color: theme.colors.palette.slate },
          symbol: 'none',
          smooth: true,
          connectNulls: true,
        })
      }
    } else if (lineMode === 'temperature') {
      series.push({
        name: showPrev ? `${d.curLabel}気温` : '気温',
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.temp ?? null),
        lineStyle: { color: tempColor, width: 2 },
        itemStyle: { color: tempColor },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true,
      })
      if (showPrev && prevWeatherMap.size > 0) {
        series.push({
          name: `${d.compLabel}気温`,
          type: 'line',
          yAxisIndex: 1,
          data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.temp ?? null),
          lineStyle: { color: theme.colors.palette.slate, width: 1.5 },
          itemStyle: { color: theme.colors.palette.slate },
          symbol: 'circle',
          symbolSize: 3,
          smooth: true,
          connectNulls: true,
        })
      }
    } else {
      // precipitation
      series.push({
        name: showPrev ? `${d.curLabel}降水量` : '降水量',
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.precip ?? null),
        lineStyle: { color: precipColor, width: 2 },
        itemStyle: { color: precipColor },
        areaStyle: { color: `${precipColor}20` },
        symbol: 'circle',
        symbolSize: 4,
        smooth: true,
      })
      if (showPrev && prevWeatherMap.size > 0) {
        series.push({
          name: `${d.compLabel}降水量`,
          type: 'line',
          yAxisIndex: 1,
          data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.precip ?? null),
          lineStyle: { color: theme.colors.palette.slate, width: 1.5 },
          itemStyle: { color: theme.colors.palette.slate },
          symbol: 'circle',
          symbolSize: 3,
          smooth: true,
          connectNulls: true,
        })
      }
    }

    // ── 右Y軸のフォーマッタ ──
    const rightYAxisFormatter =
      lineMode === 'quantity'
        ? (v: number) => toComma(v)
        : lineMode === 'temperature'
          ? (v: number) => `${v}°`
          : (v: number) => `${v}mm`

    return {
      grid: { left: GRID_LEFT, right: GRID_RIGHT, top: 10, bottom: 40, containLabel: false },
      tooltip: standardTooltip(theme),
      legend: { show: false },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
          formatter: (v: string) => `${v}時`,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: [
        yenYAxis(theme),
        valueYAxis(theme, {
          formatter: rightYAxisFormatter,
          position: 'right',
          showSplitLine: false,
        }),
      ],
      series,
    }
  }, [
    hours,
    d.chartData,
    d.curLabel,
    d.compLabel,
    showPrev,
    theme,
    lineMode,
    curWeatherMap,
    prevWeatherMap,
  ])

  if (d.error) {
    return (
      <ChartCard title="時間帯別売上" ariaLabel="時間帯別売上">
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {d.error}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (d.isLoading && !d.chartData.length) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || d.chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <ChartCard
      title={`時間帯別 ${d.compLabel}比較`}
      ariaLabel="時間帯別売上"
      toolbar={
        <Controls>
          {d.hasPrev && (
            <TabGroup>
              <Tab $active={d.compMode === 'yoy'} onClick={() => d.setCompMode('yoy')}>
                前年比
              </Tab>
              <Tab $active={d.compMode === 'wow'} onClick={() => d.setCompMode('wow')}>
                前週比
              </Tab>
            </TabGroup>
          )}
          {d.deptOptions.length > 1 && (
            <HierarchySelect value={d.deptCode} onChange={(e) => d.setDeptCode(e.target.value)}>
              <option value="">全部門</option>
              {d.deptOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </HierarchySelect>
          )}
          {d.deptCode && d.lineOptions.length > 1 && (
            <HierarchySelect value={d.lineCode} onChange={(e) => d.setLineCode(e.target.value)}>
              <option value="">全ライン</option>
              {d.lineOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </HierarchySelect>
          )}
          {d.lineCode && d.klassOptions.length > 1 && (
            <HierarchySelect value={d.klassCode} onChange={(e) => d.setKlassCode(e.target.value)}>
              <option value="">全クラス</option>
              {d.klassOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </HierarchySelect>
          )}
          <TabGroup>
            <Tab $active={lineMode === 'quantity'} onClick={() => setLineMode('quantity')}>
              点数
            </Tab>
            {hasWeatherData && (
              <>
                <Tab
                  $active={lineMode === 'temperature'}
                  onClick={() => setLineMode('temperature')}
                >
                  気温
                </Tab>
                <Tab
                  $active={lineMode === 'precipitation'}
                  onClick={() => setLineMode('precipitation')}
                >
                  降水量
                </Tab>
              </>
            )}
          </TabGroup>
        </Controls>
      }
    >
      {/* ── KPI サマリー ── */}
      {d.kpi && (
        <Grid>
          <Card $accent={palette.primary}>
            <CardLabel>{d.curLabel} 総売上</CardLabel>
            <CardValue>{Math.round(d.kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
            <CardSub>
              {d.kpi.totalAmount.toLocaleString()}円
              {d.kpi.yoyRatio != null && (
                <YoYBadge $positive={d.kpi.yoyRatio >= 1}>
                  {d.kpi.yoyRatio >= 1 ? '+' : ''}
                  {toPct(d.kpi.yoyRatio - 1)}
                </YoYBadge>
              )}
            </CardSub>
          </Card>
          {d.kpi.prevTotalAmount > 0 && (
            <Card $accent={ct.colors.slate}>
              <CardLabel>{d.compLabel} 総売上</CardLabel>
              <CardValue>
                {Math.round(d.kpi.prevTotalAmount / 10000).toLocaleString()}万円
              </CardValue>
              <CardSub>{d.kpi.prevTotalAmount.toLocaleString()}円</CardSub>
            </Card>
          )}
          {d.kpi.yoyDiff != null && (
            <Card $accent={sc.cond(d.kpi.yoyDiff >= 0)}>
              <CardLabel>{d.compLabel}差</CardLabel>
              <CardValue style={{ color: sc.cond(d.kpi.yoyDiff >= 0) }}>
                {d.kpi.yoyDiff >= 0 ? '+' : ''}
                {Math.round(d.kpi.yoyDiff / 10000).toLocaleString()}万円
              </CardValue>
              <CardSub>
                {d.compLabel}比 {toPct(d.kpi.yoyRatio ?? 0)}
              </CardSub>
            </Card>
          )}
          <Card $accent={palette.cyanDark}>
            <CardLabel>総数量</CardLabel>
            <CardValue>{d.kpi.totalQuantity.toLocaleString()}点</CardValue>
            {d.kpi.yoyQuantityRatio != null && (
              <CardSub>
                <YoYBadge $positive={d.kpi.yoyQuantityRatio >= 1}>
                  {d.kpi.yoyQuantityRatio >= 1 ? '+' : ''}
                  {toPct(d.kpi.yoyQuantityRatio - 1)}
                </YoYBadge>
              </CardSub>
            )}
          </Card>
          <Card $accent={palette.warningDark}>
            <CardLabel>ピーク時間帯</CardLabel>
            <CardValue>{d.kpi.peakHour}時台</CardValue>
            <CardSub>構成比 {d.kpi.peakHourPct}</CardSub>
          </Card>
          <Card $accent={palette.purpleDark}>
            <CardLabel>コアタイム</CardLabel>
            <CardValue>{formatCoreTime(d.kpi.coreTimeAmt)}</CardValue>
            <CardSub>構成比 {d.kpi.coreTimePct}</CardSub>
          </Card>
        </Grid>
      )}

      {/* ── チャート（金額棒＋折れ線、前年比較付き） ── */}
      <EChart option={chartOption} height={320} ariaLabel="時間帯別売上チャート" />

      {/* ── 凡例（チャート下に HTML で表示） ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          fontSize: chartFontSize.axis,
          color: theme.colors.text3,
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        <LegendItem color={palette.primary}>
          {showPrev ? `${d.curLabel}売上` : '売上金額'}
        </LegendItem>
        {showPrev && <LegendItem color={`${palette.slate}80`}>{d.compLabel}売上</LegendItem>}
        {lineMode === 'quantity' && (
          <>
            <LegendItem color={palette.cyan} dashed>
              {showPrev ? `${d.curLabel}点数` : '点数'}
            </LegendItem>
            {showPrev && (
              <LegendItem color={palette.slate} dashed>
                {d.compLabel}点数
              </LegendItem>
            )}
          </>
        )}
        {lineMode === 'temperature' && (
          <>
            <LegendItem color={palette.warningDark}>
              {showPrev ? `${d.curLabel}気温` : '気温'}
            </LegendItem>
            {showPrev && prevWeatherMap.size > 0 && (
              <LegendItem color={palette.slate}>{d.compLabel}気温</LegendItem>
            )}
          </>
        )}
        {lineMode === 'precipitation' && (
          <>
            <LegendItem color={palette.infoDark}>
              {showPrev ? `${d.curLabel}降水量` : '降水量'}
            </LegendItem>
            {showPrev && prevWeatherMap.size > 0 && (
              <LegendItem color={palette.slate}>{d.compLabel}降水量</LegendItem>
            )}
          </>
        )}
      </div>

      {/* ── 詳細ビュー切替（テーブル / ヒートマップ） ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <TabGroup>
          <Tab $active={detailView === 'table'} onClick={() => setDetailView('table')}>
            比較テーブル
          </Tab>
          {(d.categoryHourlyData?.length ?? 0) > 0 && (
            <Tab $active={detailView === 'heatmap'} onClick={() => setDetailView('heatmap')}>
              ヒートマップ
            </Tab>
          )}
        </TabGroup>
        {detailView === 'heatmap' && (
          <TabGroup>
            <Tab $active={heatmapMetric === 'amount'} onClick={() => setHeatmapMetric('amount')}>
              金額
            </Tab>
            <Tab
              $active={heatmapMetric === 'quantity'}
              onClick={() => setHeatmapMetric('quantity')}
            >
              点数
            </Tab>
          </TabGroup>
        )}
      </div>

      {detailView === 'table' ? (
        <TimeSlotComparisonTable
          chartData={d.chartData}
          curLabel={d.curLabel}
          compLabel={d.compLabel}
          hasPrev={d.hasPrev}
          gridLeft={GRID_LEFT}
          gridRight={GRID_RIGHT}
        />
      ) : (
        <CategoryTimeHeatmap
          data={d.categoryHourlyData ?? []}
          metric={heatmapMetric}
          gridLeft={80}
          gridRight={GRID_RIGHT}
        />
      )}

      {d.insights.length > 0 && (
        <InsightBar>
          {d.insights.map((line, i) => (
            <InsightItem key={i}>{line}</InsightItem>
          ))}
        </InsightBar>
      )}
    </ChartCard>
  )
})
