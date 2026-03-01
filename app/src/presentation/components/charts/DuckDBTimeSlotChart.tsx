/**
 * DuckDB 時間帯別売上チャート（統合版）
 *
 * レガシー TimeSlotSalesChart の全機能を DuckDB ベースで再実装:
 * - チャート / KPIサマリー / 前年比較 の3ビュー
 * - 金額 / 点数 メトリック切替
 * - 前年 / 前週 比較モード
 * - 合計 / 日平均 集計モード
 * - 部門 / ライン / クラス 階層フィルタ
 * - コアタイム・折り返し時間帯・ピーク等のKPI
 * - 自動インサイト生成
 */
import { memo } from 'react'
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
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
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
import { useDuckDBTimeSlotData } from './useDuckDBTimeSlotData'

// ── Local Styled Components ──

const HierarchyRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

const HierarchySelect = styled.select`
  font-size: 0.65rem;
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Props ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

// ── Component ──

export const DuckDBTimeSlotChart = memo(function DuckDBTimeSlotChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const d = useDuckDBTimeSlotData({ duckConn, duckDataVersion, currentDateRange, selectedStoreIds })

  if (d.error) {
    return (
      <Wrapper aria-label="時間帯別売上（DuckDB）">
        <Title>時間帯別売上（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {d.error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || d.chartData.length === 0) {
    return null
  }

  const showPrev = d.hasPrev && d.showPrev
  const modeLabel = d.mode === 'daily' ? '（日平均）' : ''
  const titleText =
    d.viewMode === 'yoy'
      ? `時間帯別 ${d.compLabel}比較`
      : `時間帯別${d.metricMode === 'amount' ? '売上' : '数量'}${d.viewMode === 'kpi' ? ' サマリー' : ''}`

  return (
    <Wrapper aria-label="時間帯別売上（DuckDB）">
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

      {/* ── Chart view ── */}
      {d.viewMode === 'chart' && (
        <div style={{ width: '100%', height: 320, minHeight: 0 }}>
          <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
            <ComposedChart data={d.chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="duckTimeAmtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="duckTimeQtyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.cyan} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={ct.colors.cyan} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
              <XAxis
                dataKey="hour"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={{ stroke: ct.grid }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={d.metricMode === 'amount' ? fmt : (v: number) => toComma(v)}
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle(ct)}
                formatter={(value: number | undefined, name?: string) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? `${d.curLabel}売上` : '売上金額',
                    quantity: showPrev ? `${d.curLabel}数量` : '数量',
                    prevAmount: `${d.compLabel}売上`,
                    prevQuantity: `${d.compLabel}数量`,
                  }
                  const label = labels[name as string] ?? String(name)
                  if (name === 'amount' || name === 'prevAmount')
                    return [toComma(value as number) + '円', label]
                  return [toComma(value as number) + '点', label]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? `${d.curLabel}売上` : '売上金額',
                    quantity: showPrev ? `${d.curLabel}数量` : '数量',
                    prevAmount: `${d.compLabel}売上`,
                    prevQuantity: `${d.compLabel}数量`,
                  }
                  return labels[value] ?? value
                }}
              />
              <Bar
                yAxisId="left"
                dataKey={d.metricMode}
                fill={d.metricMode === 'amount' ? 'url(#duckTimeAmtGrad)' : 'url(#duckTimeQtyGrad)'}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              {showPrev && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={d.metricMode === 'amount' ? 'prevAmount' : 'prevQuantity'}
                  stroke={ct.colors.slate}
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
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
                      tickFormatter={fmt}
                      width={50}
                    />
                    <ReferenceLine y={0} stroke={ct.grid} />
                    <Tooltip
                      contentStyle={tooltipStyle(ct)}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        const labels: Record<string, string> = {
                          current: d.curLabel,
                          prevYear: d.compLabel,
                          diff: '差分',
                        }
                        const label = labels[name as string] ?? String(name)
                        const v = value ?? 0
                        if (name === 'diff') return [`${v >= 0 ? '+' : ''}${toComma(v)}円`, label]
                        return [`${toComma(v)}円`, label]
                      }}
                      itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
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
