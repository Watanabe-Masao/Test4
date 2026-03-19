/**
 * 時間帯別売上チャート
 *
 * レガシー TimeSlotSalesChart の全機能を統合パイプラインで再実装:
 * - チャート / KPIサマリー / 前年比較 の3ビュー
 * - 金額 / 点数 メトリック切替
 * - 前年 / 前週 比較モード
 * - 合計 / 日平均 集計モード
 * - 部門 / ライン / クラス 階層フィルタ
 * - コアタイム・折り返し時間帯・ピーク等のKPI
 * - 自動インサイト生成
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useChartTheme, useCurrencyFormatter, toComma, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { formatCoreTime, formatTurnaroundHour } from './timeSlotUtils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import {
  Wrapper,
  HeaderRow,
  Title,
  Controls,
  TabGroup,
  Tab,
  Separator,
  Grid,
  Card,
  CardLabel,
  CardValue,
  CardSub,
  YoYBadge,
  SummaryRow,
  Metric,
  MetricLabel,
  MetricValue,
  ProgressBarWrap,
  ProgressTrack,
  ProgressFill,
  ProgressLabelRow,
  InsightBar,
  InsightItem,
  TableWrapper,
  MiniTable,
  MiniTh,
  MiniTd,
} from './TimeSlotSalesChart.styles'
import { HierarchyRow, HierarchySelect, ErrorMsg } from './TimeSlotChart.styles'
import { useDuckDBTimeSlotData } from './useDuckDBTimeSlotData'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'

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
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const d = useDuckDBTimeSlotData({
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
  })

  const showPrev = d.hasPrev && d.showPrev

  // ECharts option for chart view
  const chartOption = useMemo<EChartsOption>(() => {
    const hours = d.chartData.map((r) => String(r.hour))
    const isAmount = d.metricMode === 'amount'
    const dataKey = isAmount ? 'amount' : 'quantity'
    const barColor = isAmount ? theme.colors.palette.primary : theme.colors.palette.cyan

    const series: EChartsOption['series'] = [
      {
        name: isAmount ? (showPrev ? `${d.curLabel}売上` : '売上金額') : (showPrev ? `${d.curLabel}数量` : '数量'),
        type: 'bar',
        data: d.chartData.map((r) => (r as Record<string, unknown>)[dataKey] as number),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
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
      const prevKey = isAmount ? 'prevAmount' : 'prevQuantity'
      series.push({
        name: isAmount ? `${d.compLabel}売上` : `${d.compLabel}数量`,
        type: 'line',
        data: d.chartData.map((r) => (r as Record<string, unknown>)[prevKey] as number ?? null),
        lineStyle: { color: theme.colors.palette.slate, width: 2.5, type: 'dashed' },
        itemStyle: { color: theme.colors.palette.slate },
        symbol: 'none',
        connectNulls: true,
      })
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: standardLegend(theme),
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: theme.colors.text3, fontSize: 10, fontFamily: theme.typography.fontFamily.mono },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: isAmount
        ? yenYAxis(theme)
        : {
            type: 'value',
            axisLabel: { formatter: (v: number) => toComma(v), color: theme.colors.text3, fontSize: 10 },
            axisLine: { show: false },
            splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
          },
      series,
    }
  }, [d.chartData, d.metricMode, d.curLabel, d.compLabel, showPrev, theme])

  if (d.error) {
    return (
      <Wrapper aria-label="時間帯別売上">
        <Title>時間帯別売上</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {d.error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (d.isLoading && !d.chartData.length) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || d.chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const modeLabel = d.mode === 'daily' ? '（日平均）' : ''
  const titleText =
    d.viewMode === 'yoy'
      ? `時間帯別 ${d.compLabel}比較`
      : `時間帯別${d.metricMode === 'amount' ? '売上' : '数量'}${d.viewMode === 'kpi' ? ' サマリー' : ''}`

  return (
    <Wrapper aria-label="時間帯別売上">
      <HeaderRow>
        <Title>
          {titleText}
          {modeLabel}
        </Title>
        <Controls>
          {d.viewMode !== 'yoy' && (
            <TabGroup>
              <Tab $active={d.metricMode === 'amount'} onClick={() => d.setMetricMode('amount')}>
                金額
              </Tab>
              <Tab
                $active={d.metricMode === 'quantity'}
                onClick={() => d.setMetricMode('quantity')}
              >
                点数
              </Tab>
            </TabGroup>
          )}
          {d.hasPrev && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={d.compMode === 'yoy'} onClick={() => d.setCompMode('yoy')}>
                  前年比
                </Tab>
                <Tab $active={d.compMode === 'wow'} onClick={() => d.setCompMode('wow')}>
                  前週比
                </Tab>
              </TabGroup>
            </>
          )}
          {d.hasPrev && d.viewMode === 'chart' && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={d.showPrev} onClick={() => d.setShowPrev(!d.showPrev)}>
                  {d.compLabel}比較
                </Tab>
              </TabGroup>
            </>
          )}
          <Separator />
          <TabGroup>
            <Tab $active={d.mode === 'total'} onClick={() => d.setMode('total')}>
              合計
            </Tab>
            <Tab $active={d.mode === 'daily'} onClick={() => d.setMode('daily')}>
              日平均
            </Tab>
          </TabGroup>
          <Separator />
          <TabGroup>
            <Tab $active={d.viewMode === 'chart'} onClick={() => d.setViewMode('chart')}>
              チャート
            </Tab>
            <Tab $active={d.viewMode === 'kpi'} onClick={() => d.setViewMode('kpi')}>
              KPI
            </Tab>
            {d.hasPrev && (
              <Tab $active={d.viewMode === 'yoy'} onClick={() => d.setViewMode('yoy')}>
                {d.compLabel}比較
              </Tab>
            )}
          </TabGroup>
        </Controls>
      </HeaderRow>

      {/* ── Chart view (ECharts) ── */}
      {d.viewMode === 'chart' && (
        <EChart option={chartOption} height={320} ariaLabel="時間帯別売上チャート" />
      )}

      {/* ── KPI view ── */}
      {d.viewMode === 'kpi' && d.kpi && (
        <Grid>
          {d.metricMode === 'amount' ? (
            <>
              <Card $accent={palette.primary}>
                <CardLabel>{d.curLabel} 総売上金額</CardLabel>
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
                  <CardLabel>{d.compLabel} 総売上金額</CardLabel>
                  <CardValue>
                    {Math.round(d.kpi.prevTotalAmount / 10000).toLocaleString()}万円
                  </CardValue>
                  <CardSub>{d.kpi.prevTotalAmount.toLocaleString()}円</CardSub>
                </Card>
              )}
              {d.kpi.yoyDiff != null && (
                <Card $accent={sc.cond(d.kpi.yoyDiff >= 0)}>
                  <CardLabel>{d.compLabel}差（金額）</CardLabel>
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
              <Card $accent={sc.negative}>
                <CardLabel>折り返し時間帯</CardLabel>
                <CardValue>{formatTurnaroundHour(d.kpi.turnaroundAmt)}</CardValue>
                <CardSub>累積50%到達</CardSub>
              </Card>
              <Card $accent="#14b8a6">
                <CardLabel>時間帯平均</CardLabel>
                <CardValue>{Math.round(d.kpi.avgPerHour / 10000).toLocaleString()}万</CardValue>
                <CardSub>{d.kpi.activeHours}時間帯</CardSub>
              </Card>
            </>
          ) : (
            <>
              <Card $accent={palette.cyanDark}>
                <CardLabel>{d.curLabel} 総数量</CardLabel>
                <CardValue>{d.kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>
                  {d.kpi.yoyQuantityRatio != null && (
                    <YoYBadge $positive={d.kpi.yoyQuantityRatio >= 1}>
                      {d.kpi.yoyQuantityRatio >= 1 ? '+' : ''}
                      {toPct(d.kpi.yoyQuantityRatio - 1)}
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {d.kpi.prevTotalQuantity > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>{d.compLabel} 総数量</CardLabel>
                  <CardValue>{d.kpi.prevTotalQuantity.toLocaleString()}点</CardValue>
                </Card>
              )}
              {d.kpi.yoyQuantityDiff != null && (
                <Card $accent={sc.cond(d.kpi.yoyQuantityDiff >= 0)}>
                  <CardLabel>{d.compLabel}差（数量）</CardLabel>
                  <CardValue style={{ color: sc.cond(d.kpi.yoyQuantityDiff >= 0) }}>
                    {d.kpi.yoyQuantityDiff >= 0 ? '+' : ''}
                    {d.kpi.yoyQuantityDiff.toLocaleString()}点
                  </CardValue>
                  <CardSub>
                    {d.compLabel}比 {toPct(d.kpi.yoyQuantityRatio ?? 0)}
                  </CardSub>
                </Card>
              )}
              <Card $accent={palette.primary}>
                <CardLabel>総売上金額</CardLabel>
                <CardValue>{Math.round(d.kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>{d.kpi.totalAmount.toLocaleString()}円</CardSub>
              </Card>
              <Card $accent={palette.warningDark}>
                <CardLabel>ピーク時間帯</CardLabel>
                <CardValue>{d.kpi.peakHourQty}時台</CardValue>
                <CardSub>構成比 {d.kpi.peakHourQtyPct}</CardSub>
              </Card>
              <Card $accent={palette.purpleDark}>
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(d.kpi.coreTimeQty)}</CardValue>
                <CardSub>構成比 {d.kpi.coreTimeQtyPct}</CardSub>
              </Card>
              <Card $accent={sc.negative}>
                <CardLabel>折り返し時間帯</CardLabel>
                <CardValue>{formatTurnaroundHour(d.kpi.turnaroundQty)}</CardValue>
                <CardSub>累積50%到達</CardSub>
              </Card>
              <Card $accent="#14b8a6">
                <CardLabel>時間帯平均</CardLabel>
                <CardValue>{d.kpi.avgQtyPerHour.toLocaleString()}点</CardValue>
                <CardSub>{d.kpi.activeHours}時間帯</CardSub>
              </Card>
            </>
          )}
        </Grid>
      )}

      {/* ── YoY comparison view ── */}
      {d.viewMode === 'yoy' &&
        d.yoyData &&
        (() => {
          const s = d.yoyData.summary
          const yoyColor = (s.yoyRatio ?? 0) >= 1 ? ct.colors.success : ct.colors.danger
          return (
            <>
              <SummaryRow>
                <Metric>
                  <MetricLabel>{d.curLabel}合計</MetricLabel>
                  <MetricValue>{fmt(s.curTotal)}円</MetricValue>
                </Metric>
                {s.yoyRatio != null && (
                  <ProgressBarWrap>
                    <ProgressLabelRow>
                      <span>
                        {d.compLabel}比 {toPct(s.yoyRatio)}
                      </span>
                      <span>
                        {s.yoyDiff >= 0 ? '+' : ''}
                        {fmt(s.yoyDiff)}円
                      </span>
                    </ProgressLabelRow>
                    <ProgressTrack>
                      <ProgressFill $pct={s.yoyRatio * 100} $color={yoyColor} />
                    </ProgressTrack>
                  </ProgressBarWrap>
                )}
                <Metric>
                  <MetricLabel>{d.compLabel}合計</MetricLabel>
                  <MetricValue $color={ct.colors.slate}>{fmt(s.prevTotal)}円</MetricValue>
                </Metric>
                {s.maxIncHour >= 0 && (
                  <Metric>
                    <MetricLabel>最大増加時間帯</MetricLabel>
                    <MetricValue $color={sc.positive}>
                      {s.maxIncHour}時 (+{fmt(s.maxIncDiff)})
                    </MetricValue>
                  </Metric>
                )}
                {s.maxDecHour >= 0 && (
                  <Metric>
                    <MetricLabel>最大減少時間帯</MetricLabel>
                    <MetricValue $color={sc.negative}>
                      {s.maxDecHour}時 ({fmt(s.maxDecDiff)})
                    </MetricValue>
                  </Metric>
                )}
                <Metric>
                  <MetricLabel>コアタイム（{d.curLabel}）</MetricLabel>
                  <MetricValue>{formatCoreTime(s.curCoreTime)}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>折り返し（{d.curLabel}）</MetricLabel>
                  <MetricValue>{formatTurnaroundHour(s.curTurnaround)}</MetricValue>
                </Metric>
                {s.prevCoreTime && (
                  <Metric>
                    <MetricLabel>コアタイム（{d.compLabel}）</MetricLabel>
                    <MetricValue $color={ct.colors.slate}>
                      {formatCoreTime(s.prevCoreTime)}
                    </MetricValue>
                  </Metric>
                )}
                {s.prevTurnaround != null && (
                  <Metric>
                    <MetricLabel>折り返し（{d.compLabel}）</MetricLabel>
                    <MetricValue $color={ct.colors.slate}>
                      {formatTurnaroundHour(s.prevTurnaround)}
                    </MetricValue>
                  </Metric>
                )}
              </SummaryRow>

              <div style={{ width: '100%', height: 300, minHeight: 0 }}>
                <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                  <ComposedChart
                    data={d.yoyData.chartData}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="duckYoyCurGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
                    <XAxis
                      dataKey="hour"
                      tick={{
                        fill: ct.textMuted,
                        fontSize: ct.fontSize.xs,
                        fontFamily: ct.monoFamily,
                      }}
                      axisLine={{ stroke: ct.grid }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: ct.textMuted,
                        fontSize: ct.fontSize.xs,
                        fontFamily: ct.monoFamily,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={toAxisYen}
                      width={50}
                    />
                    <ReferenceLine y={0} stroke={ct.grid} />
                    <Tooltip
                      content={createChartTooltip({
                        ct,
                        formatter: (value: unknown, name: string) => {
                          const labels: Record<string, string> = {
                            current: d.curLabel,
                            prevYear: d.compLabel,
                            diff: '差分',
                          }
                          const label = labels[name] ?? String(name)
                          const v = (value as number) ?? 0
                          if (name === 'diff') return [`${v >= 0 ? '+' : ''}${toComma(v)}円`, label]
                          return [`${toComma(v)}円`, label]
                        },
                      })}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          current: d.curLabel,
                          prevYear: d.compLabel,
                          diff: '差分',
                        }
                        return labels[value] ?? value
                      }}
                    />
                    <Bar
                      dataKey="current"
                      fill="url(#duckYoyCurGrad)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={20}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevYear"
                      stroke={ct.colors.slate}
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <TableWrapper>
                <MiniTable>
                  <thead>
                    <tr>
                      <MiniTh>時間帯</MiniTh>
                      <MiniTh>{d.curLabel}</MiniTh>
                      <MiniTh>{d.compLabel}</MiniTh>
                      <MiniTh>差分</MiniTh>
                      <MiniTh>{d.compLabel}比</MiniTh>
                    </tr>
                  </thead>
                  <tbody>
                    {d.yoyData.rows.map((row) => (
                      <tr key={row.hour}>
                        <MiniTd>{row.hour}</MiniTd>
                        <MiniTd>{toComma(row.current)}円</MiniTd>
                        <MiniTd>{toComma(row.prevYear)}円</MiniTd>
                        <MiniTd $highlight $positive={row.diff >= 0}>
                          {row.diff >= 0 ? '+' : ''}
                          {toComma(row.diff)}円
                        </MiniTd>
                        <MiniTd $highlight $positive={(row.ratio ?? 0) >= 1}>
                          {row.ratio != null ? toPct(row.ratio) : '-'}
                        </MiniTd>
                      </tr>
                    ))}
                  </tbody>
                </MiniTable>
              </TableWrapper>
            </>
          )
        })()}

      {d.insights.length > 0 && (
        <InsightBar>
          {d.insights.map((line, i) => (
            <InsightItem key={i}>{line}</InsightItem>
          ))}
        </InsightBar>
      )}

      {/* ── Hierarchy filter ── */}
      {(d.deptOptions.length > 1 || d.lineOptions.length > 1 || d.klassOptions.length > 1) && (
        <HierarchyRow>
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
        </HierarchyRow>
      )}
    </Wrapper>
  )
})
