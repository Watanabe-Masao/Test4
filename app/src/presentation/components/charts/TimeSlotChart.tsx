/**
 * 時間帯別売上チャート
 *
 * 金額(棒) + 点数(点線) の統合チャート、KPIサマリー、比較テーブル、
 * カテゴリ×時間帯ヒートマップを1画面に表示。前年/前週の切り替え対応。
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import { useChartTheme, toComma, toPct } from './chartTheme'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardTooltip, standardLegend } from './echartsOptionBuilders'
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

// ── Props ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

// ── Component ──

export const TimeSlotChart = memo(function TimeSlotChart({
  duckConn,
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

  const d = useDuckDBTimeSlotData({
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
  })

  const showPrev = d.hasPrev && d.showPrev

  // 天気データをテーブル用に変換
  const curWeatherForTable = useMemo(
    () =>
      d.curWeatherAvg?.map((w) => ({
        hour: w.hour,
        avgTemperature: w.avgTemperature,
        totalPrecipitation: w.totalPrecipitation,
      })),
    [d.curWeatherAvg],
  )
  const prevWeatherForTable = useMemo(
    () =>
      d.prevWeatherAvg?.map((w) => ({
        hour: w.hour,
        avgTemperature: w.avgTemperature,
        totalPrecipitation: w.totalPrecipitation,
      })),
    [d.prevWeatherAvg],
  )

  // ECharts option for chart view — 金額(棒) + 点数(点線) 同時表示
  const chartOption = useMemo<EChartsOption>(() => {
    const hours = d.chartData.map((r) => String(r.hour))
    const barColor = theme.colors.palette.primary
    const qtyColor = theme.colors.palette.cyan

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
      {
        name: showPrev ? `${d.curLabel}点数` : '点数',
        type: 'line',
        yAxisIndex: 1,
        data: d.chartData.map((r) => (r as Record<string, unknown>).quantity as number),
        lineStyle: { color: qtyColor, width: 2, type: 'dashed' },
        itemStyle: { color: qtyColor },
        symbol: 'none',
        smooth: true,
      },
    ]

    if (showPrev) {
      series.push(
        {
          name: `${d.compLabel}売上`,
          type: 'bar',
          yAxisIndex: 0,
          data: d.chartData.map(
            (r) => ((r as Record<string, unknown>).prevAmount as number) ?? null,
          ),
          itemStyle: {
            color: `${theme.colors.palette.slate}80`,
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 20,
        },
        {
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
        },
      )
    }

    return {
      grid: { left: GRID_LEFT, right: GRID_RIGHT, top: 30, bottom: 20, containLabel: false },
      tooltip: standardTooltip(theme),
      legend: standardLegend(theme),
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: [
        yenYAxis(theme),
        valueYAxis(theme, {
          formatter: (v: number) => toComma(v),
          position: 'right',
          showSplitLine: false,
        }),
      ],
      series,
    }
  }, [d.chartData, d.curLabel, d.compLabel, showPrev, theme])

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

      {/* ── チャート（金額棒＋点数点線、前年比較付き） ── */}
      <EChart option={chartOption} height={320} ariaLabel="時間帯別売上チャート" />

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
          curWeather={curWeatherForTable}
          prevWeather={prevWeatherForTable}
          gridLeft={GRID_LEFT}
          gridRight={GRID_RIGHT}
        />
      ) : (
        <CategoryTimeHeatmap
          data={d.categoryHourlyData ?? []}
          metric={heatmapMetric}
          gridLeft={GRID_LEFT}
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
