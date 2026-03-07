import { useState, memo } from 'react'
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
import { useChartTheme, useCurrencyFormatter, toComma, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './ChartTooltip'
import { formatCoreTime, formatTurnaroundHour } from './timeSlotUtils'
import type { CategoryTimeSalesIndex } from '@/domain/models'
import { usePeriodFilter } from './periodFilterHooks'
import { PeriodFilterBar, HierarchyDropdowns } from './PeriodFilter'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Wrapper,
  HeaderRow,
  Title,
  Controls,
  TabGroup,
  Tab,
  Separator,
  EmptyFilterMsg,
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
import { useTimeSlotData, type ViewMode, type MetricMode } from './useTimeSlotData'

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  dataMaxDay?: number
}

/** 時間帯別売上チャート（チャート / KPIサマリー 切替、前年比較・前週比較対応） */
export const TimeSlotSalesChart = memo(function TimeSlotSalesChart({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  daysInMonth,
  year,
  month,
  dataMaxDay,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [showPrevYear, setShowPrevYear] = useState(true)
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)

  const { chartData, kpi, yoyData, insights, hasPrevYear, prevLbl, curLbl, canWoW, hf } =
    useTimeSlotData({
      ctsIndex,
      prevCtsIndex,
      selectedStoreIds,
      year,
      month,
      pf,
      compMode,
    })

  if (chartData.length === 0)
    return (
      <Wrapper aria-label="時間帯売上チャート">
        <HeaderRow>
          <Title>時間帯別売上</Title>
        </HeaderRow>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
        <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
        <HierarchyDropdowns hf={hf} />
      </Wrapper>
    )

  const showPrev = hasPrevYear && showPrevYear

  const titleText =
    viewMode === 'yoy'
      ? `時間帯別 ${prevLbl}同曜日比較`
      : `時間帯別${metricMode === 'amount' ? '売上' : '数量'}${viewMode === 'kpi' ? ' サマリー' : ''}`
  const modeLabel =
    pf.mode === 'dailyAvg' ? '（日平均）' : pf.mode === 'dowAvg' ? '（曜日別平均）' : ''

  return (
    <Wrapper aria-label="時間帯売上チャート">
      <HeaderRow>
        <Title>
          {titleText}
          {modeLabel}
        </Title>
        <Controls>
          {viewMode !== 'yoy' && (
            <TabGroup>
              <Tab $active={metricMode === 'amount'} onClick={() => setMetricMode('amount')}>
                金額
              </Tab>
              <Tab $active={metricMode === 'quantity'} onClick={() => setMetricMode('quantity')}>
                点数
              </Tab>
            </TabGroup>
          )}
          {hasPrevYear && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>
                  前年比
                </Tab>
                <Tab
                  $active={compMode === 'wow'}
                  onClick={() => {
                    if (canWoW) setCompMode('wow')
                  }}
                  aria-disabled={!canWoW}
                  style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
                >
                  前週比
                </Tab>
              </TabGroup>
            </>
          )}
          {hasPrevYear && viewMode === 'chart' && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={showPrevYear} onClick={() => setShowPrevYear(!showPrevYear)}>
                  {prevLbl}比較
                </Tab>
              </TabGroup>
            </>
          )}
          <Separator />
          <TabGroup>
            <Tab $active={viewMode === 'chart'} onClick={() => setViewMode('chart')}>
              チャート
            </Tab>
            <Tab $active={viewMode === 'kpi'} onClick={() => setViewMode('kpi')}>
              KPI
            </Tab>
            {hasPrevYear && (
              <Tab $active={viewMode === 'yoy'} onClick={() => setViewMode('yoy')}>
                {prevLbl}比較
              </Tab>
            )}
          </TabGroup>
        </Controls>
      </HeaderRow>

      {/* ── Chart view ── */}
      {viewMode === 'chart' && (
        <div style={{ width: '100%', height: 320, minHeight: 0 }}>
          <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="timeAmtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="timeQtyGrad" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={metricMode === 'amount' ? toAxisYen : (v: number) => toComma(v)}
                width={50}
              />
              {!showPrev && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={metricMode === 'amount' ? (v: number) => toComma(v) : toAxisYen}
                  width={45}
                />
              )}
              <Tooltip
                content={createChartTooltip({
                  ct,
                  formatter: (value: unknown, name: string) => {
                    const labels: Record<string, string> = {
                      amount: showPrev ? `${curLbl}売上` : '売上金額',
                      quantity: showPrev ? `${curLbl}数量` : '数量',
                      prevAmount: `${prevLbl}売上`,
                      prevQuantity: `${prevLbl}数量`,
                    }
                    const label = labels[name] ?? String(name)
                    if (name === 'amount' || name === 'prevAmount')
                      return [toComma(value as number) + '円', label]
                    return [toComma(value as number) + '点', label]
                  },
                })}
              />
              <Legend
                wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? `${curLbl}売上` : '売上金額',
                    quantity: showPrev ? `${curLbl}数量` : '数量',
                    prevAmount: `${prevLbl}売上`,
                    prevQuantity: `${prevLbl}数量`,
                  }
                  return labels[value] ?? value
                }}
              />
              <Bar
                yAxisId="left"
                dataKey={metricMode}
                fill={metricMode === 'amount' ? 'url(#timeAmtGrad)' : 'url(#timeQtyGrad)'}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              {!showPrev && (
                <Bar
                  yAxisId="right"
                  dataKey={metricMode === 'amount' ? 'quantity' : 'amount'}
                  fill={metricMode === 'amount' ? 'url(#timeQtyGrad)' : 'url(#timeAmtGrad)'}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
              )}
              {showPrev && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={metricMode === 'amount' ? 'prevAmount' : 'prevQuantity'}
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
      {viewMode === 'kpi' && kpi && (
        <Grid>
          {metricMode === 'amount' ? (
            <>
              <Card $accent={palette.primary}>
                <CardLabel>{curLbl} 総売上金額</CardLabel>
                <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>
                  {kpi.totalAmount.toLocaleString()}円
                  {kpi.yoyRatio != null && (
                    <YoYBadge $positive={kpi.yoyRatio >= 1}>
                      {kpi.yoyRatio >= 1 ? '+' : ''}
                      {toPct(kpi.yoyRatio - 1)}
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {kpi.prevTotalAmount > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>{prevLbl} 総売上金額</CardLabel>
                  <CardValue>
                    {Math.round(kpi.prevTotalAmount / 10000).toLocaleString()}万円
                  </CardValue>
                  <CardSub>{kpi.prevTotalAmount.toLocaleString()}円</CardSub>
                </Card>
              )}
              {kpi.yoyDiff != null && (
                <Card $accent={sc.cond(kpi.yoyDiff >= 0)}>
                  <CardLabel>{prevLbl}差（金額）</CardLabel>
                  <CardValue style={{ color: sc.cond(kpi.yoyDiff >= 0) }}>
                    {kpi.yoyDiff >= 0 ? '+' : ''}
                    {Math.round(kpi.yoyDiff / 10000).toLocaleString()}万円
                  </CardValue>
                  <CardSub>
                    {prevLbl}比 {toPct(kpi.yoyRatio ?? 0)}
                  </CardSub>
                </Card>
              )}
              <Card $accent={palette.cyanDark}>
                <CardLabel>総数量</CardLabel>
                <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>{kpi.recordCount.toLocaleString()}レコード</CardSub>
              </Card>
              <Card $accent={palette.warningDark}>
                <CardLabel>ピーク時間帯</CardLabel>
                <CardValue>{kpi.peakHour}時台</CardValue>
                <CardSub>構成比 {kpi.peakHourPct}</CardSub>
              </Card>
              <Card $accent={palette.purpleDark}>
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeAmt)}</CardValue>
                <CardSub>構成比 {kpi.coreTimePct}</CardSub>
              </Card>
              <Card $accent={sc.negative}>
                <CardLabel>折り返し時間帯</CardLabel>
                <CardValue>{formatTurnaroundHour(kpi.turnaroundAmt)}</CardValue>
                <CardSub>累積50%到達</CardSub>
              </Card>
              <Card $accent="#14b8a6">
                <CardLabel>時間帯平均</CardLabel>
                <CardValue>{Math.round(kpi.avgPerHour / 10000).toLocaleString()}万</CardValue>
                <CardSub>{kpi.activeHours}時間帯</CardSub>
              </Card>
            </>
          ) : (
            <>
              <Card $accent={palette.cyanDark}>
                <CardLabel>{curLbl} 総数量</CardLabel>
                <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>
                  {kpi.recordCount.toLocaleString()}レコード
                  {kpi.yoyQuantityRatio != null && (
                    <YoYBadge $positive={kpi.yoyQuantityRatio >= 1}>
                      {kpi.yoyQuantityRatio >= 1 ? '+' : ''}
                      {toPct(kpi.yoyQuantityRatio - 1)}
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {kpi.prevTotalQuantity > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>{prevLbl} 総数量</CardLabel>
                  <CardValue>{kpi.prevTotalQuantity.toLocaleString()}点</CardValue>
                </Card>
              )}
              {kpi.yoyQuantityDiff != null && (
                <Card $accent={sc.cond(kpi.yoyQuantityDiff >= 0)}>
                  <CardLabel>{prevLbl}差（数量）</CardLabel>
                  <CardValue style={{ color: sc.cond(kpi.yoyQuantityDiff >= 0) }}>
                    {kpi.yoyQuantityDiff >= 0 ? '+' : ''}
                    {kpi.yoyQuantityDiff.toLocaleString()}点
                  </CardValue>
                  <CardSub>
                    {prevLbl}比 {toPct(kpi.yoyQuantityRatio ?? 0)}
                  </CardSub>
                </Card>
              )}
              <Card $accent={palette.primary}>
                <CardLabel>総売上金額</CardLabel>
                <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>{kpi.totalAmount.toLocaleString()}円</CardSub>
              </Card>
              <Card $accent={palette.warningDark}>
                <CardLabel>ピーク時間帯</CardLabel>
                <CardValue>{kpi.peakHourQty}時台</CardValue>
                <CardSub>構成比 {kpi.peakHourQtyPct}</CardSub>
              </Card>
              <Card $accent={palette.purpleDark}>
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeQty)}</CardValue>
                <CardSub>構成比 {kpi.coreTimeQtyPct}</CardSub>
              </Card>
              <Card $accent={sc.negative}>
                <CardLabel>折り返し時間帯</CardLabel>
                <CardValue>{formatTurnaroundHour(kpi.turnaroundQty)}</CardValue>
                <CardSub>累積50%到達</CardSub>
              </Card>
              <Card $accent="#14b8a6">
                <CardLabel>時間帯平均</CardLabel>
                <CardValue>{kpi.avgQtyPerHour.toLocaleString()}点</CardValue>
                <CardSub>{kpi.activeHours}時間帯</CardSub>
              </Card>
            </>
          )}
        </Grid>
      )}

      {/* ── YoY comparison view ── */}
      {viewMode === 'yoy' &&
        yoyData &&
        (() => {
          const s = yoyData.summary
          const yoyColor = (s.yoyRatio ?? 0) >= 1 ? ct.colors.success : ct.colors.danger
          return (
            <>
              <SummaryRow>
                <Metric>
                  <MetricLabel>{curLbl}合計</MetricLabel>
                  <MetricValue>{fmt(s.curTotal)}円</MetricValue>
                </Metric>
                {s.yoyRatio != null && (
                  <ProgressBarWrap>
                    <ProgressLabelRow>
                      <span>
                        {prevLbl}比 {toPct(s.yoyRatio)}
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
                  <MetricLabel>{prevLbl}合計</MetricLabel>
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
                  <MetricLabel>コアタイム（{curLbl}）</MetricLabel>
                  <MetricValue>{formatCoreTime(s.curCoreTime)}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>折り返し（{curLbl}）</MetricLabel>
                  <MetricValue>{formatTurnaroundHour(s.curTurnaround)}</MetricValue>
                </Metric>
                {s.prevCoreTime && (
                  <Metric>
                    <MetricLabel>コアタイム（{prevLbl}）</MetricLabel>
                    <MetricValue $color={ct.colors.slate}>
                      {formatCoreTime(s.prevCoreTime)}
                    </MetricValue>
                  </Metric>
                )}
                {s.prevTurnaround != null && (
                  <Metric>
                    <MetricLabel>折り返し（{prevLbl}）</MetricLabel>
                    <MetricValue $color={ct.colors.slate}>
                      {formatTurnaroundHour(s.prevTurnaround)}
                    </MetricValue>
                  </Metric>
                )}
              </SummaryRow>

              <div style={{ width: '100%', height: 300, minHeight: 0 }}>
                <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                  <ComposedChart
                    data={yoyData.chartData}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="yoyCurGrad" x1="0" y1="0" x2="0" y2="1">
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
                            current: curLbl,
                            prevYear: `${prevLbl}同曜日`,
                            diff: '差分',
                          }
                          const label = labels[name] ?? String(name)
                          const v = (value as number) ?? 0
                          if (name === 'diff')
                            return [`${v >= 0 ? '+' : ''}${toComma(v)}円`, label]
                          return [`${toComma(v)}円`, label]
                        },
                      })}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          current: curLbl,
                          prevYear: `${prevLbl}同曜日`,
                          diff: '差分',
                        }
                        return labels[value] ?? value
                      }}
                    />
                    <Bar
                      dataKey="current"
                      fill="url(#yoyCurGrad)"
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
                      <MiniTh>{curLbl}</MiniTh>
                      <MiniTh>{prevLbl}</MiniTh>
                      <MiniTh>差分</MiniTh>
                      <MiniTh>{prevLbl}比</MiniTh>
                    </tr>
                  </thead>
                  <tbody>
                    {yoyData.rows.map((row) => {
                      const isPositive = row.diff >= 0
                      return (
                        <tr key={row.hour}>
                          <MiniTd>{row.hour}</MiniTd>
                          <MiniTd>{toComma(row.current)}円</MiniTd>
                          <MiniTd>{toComma(row.prevYear)}円</MiniTd>
                          <MiniTd $highlight $positive={isPositive}>
                            {isPositive ? '+' : ''}
                            {toComma(row.diff)}円
                          </MiniTd>
                          <MiniTd $highlight $positive={isPositive}>
                            {row.ratio != null ? toPct(row.ratio) : '-'}
                          </MiniTd>
                        </tr>
                      )
                    })}
                  </tbody>
                </MiniTable>
              </TableWrapper>
            </>
          )
        })()}

      {insights.length > 0 && (
        <InsightBar>
          {insights.map((line, i) => (
            <InsightItem key={i}>{line}</InsightItem>
          ))}
        </InsightBar>
      )}

      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
})
