import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { findCoreTime, findTurnaroundHour, formatCoreTime, formatTurnaroundHour } from './timeSlotUtils'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, useHierarchyDropdown, HierarchyDropdowns } from './PeriodFilter'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { opacity: 0.85; }
`

const Separator = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`

/* KPI Grid */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const Card = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`

const CardLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const CardValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const CardSub = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 2px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const YoYBadge = styled.span<{ $positive: boolean }>`
  font-size: 0.55rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  margin-left: 4px;
`

type ViewMode = 'chart' | 'kpi'
type MetricMode = 'amount' | 'quantity'

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  /** 前年同曜日対応済みレコード */
  prevYearRecords?: readonly CategoryTimeSalesRecord[]
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/** 時間帯別の集計結果を計算する共通関数 */
function aggregateHourly(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
  filter: ReturnType<typeof useCategoryHierarchy>['filter'],
  hf: ReturnType<typeof useHierarchyDropdown>,
  divisor: number,
) {
  const hourly = new Map<number, { amount: number; quantity: number }>()
  const filtered = hf.applyFilter(filterByHierarchy(records, filter))
  const storeFiltered = filtered.filter(
    (r) => selectedStoreIds.size === 0 || selectedStoreIds.has(r.storeId),
  )

  let totalAmount = 0
  let totalQuantity = 0
  for (const rec of storeFiltered) {
    totalAmount += rec.totalAmount
    totalQuantity += rec.totalQuantity
    for (const slot of rec.timeSlots) {
      const existing = hourly.get(slot.hour) ?? { amount: 0, quantity: 0 }
      hourly.set(slot.hour, {
        amount: existing.amount + slot.amount,
        quantity: existing.quantity + slot.quantity,
      })
    }
  }

  const div = divisor > 1 ? divisor : 1
  const result = new Map<number, { amount: number; quantity: number }>()
  for (const [h, v] of hourly) {
    result.set(h, { amount: Math.round(v.amount / div), quantity: Math.round(v.quantity / div) })
  }

  return { hourly: result, totalAmount, totalQuantity, recordCount: storeFiltered.length }
}

/** 時間帯別売上チャート（チャート / KPIサマリー 切替、前年比較対応） */
export function TimeSlotSalesChart({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month, prevYearRecords, dataMaxDay }: Props) {
  const ct = useChartTheme()
  const { filter } = useCategoryHierarchy()
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [showPrevYear, setShowPrevYear] = useState(true)
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)
  const periodRecords = useMemo(() => pf.filterRecords(categoryTimeSales.records), [categoryTimeSales, pf])
  const prevPeriodRecords = useMemo(
    () => prevYearRecords ? pf.filterRecords(prevYearRecords) : [],
    [prevYearRecords, pf],
  )
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0

  // 前年データがカバーする日の集合（日数一致比較用）
  const prevDaySet = useMemo(
    () => new Set(prevPeriodRecords.map((r) => r.day)),
    [prevPeriodRecords],
  )
  // 前年と重複する日のみの当年レコード（前年比の分母分子を揃える）
  const comparablePeriodRecords = useMemo(
    () => hasPrevYear ? periodRecords.filter((r) => prevDaySet.has(r.day)) : periodRecords,
    [periodRecords, prevDaySet, hasPrevYear],
  )

  const div = pf.mode !== 'total' ? pf.divisor : 1
  const current = useMemo(
    () => aggregateHourly(periodRecords, selectedStoreIds, filter, hf, div),
    [periodRecords, selectedStoreIds, filter, hf, div],
  )
  const comparable = useMemo(
    () => hasPrevYear ? aggregateHourly(comparablePeriodRecords, selectedStoreIds, filter, hf, div) : null,
    [comparablePeriodRecords, selectedStoreIds, filter, hf, div, hasPrevYear],
  )
  const prev = useMemo(
    () => hasPrevYear ? aggregateHourly(prevPeriodRecords, selectedStoreIds, filter, hf, div) : null,
    [prevPeriodRecords, selectedStoreIds, filter, hf, div, hasPrevYear],
  )

  const { chartData, kpi } = useMemo(() => {
    const chartData: Record<string, string | number | null>[] = []
    for (let h = 0; h < 24; h++) {
      const cur = current.hourly.get(h)
      const prv = prev?.hourly.get(h)
      if (cur || prv) {
        chartData.push({
          hour: `${h}時`,
          amount: cur?.amount ?? 0,
          quantity: cur?.quantity ?? 0,
          prevAmount: prv?.amount ?? null,
          prevQuantity: prv?.quantity ?? null,
        })
      }
    }

    // KPI
    let peakHour = 0, peakHourAmount = 0
    for (const [h, v] of current.hourly) {
      if (v.amount > peakHourAmount) { peakHour = h; peakHourAmount = v.amount * div }
    }
    const totalAmount = current.totalAmount
    const peakHourPct = totalAmount > 0 ? (peakHourAmount / totalAmount * 100).toFixed(1) : '0'

    // 前年比 KPI（重複日のみで比較し、日数差バイアスを排除）
    const comparableTotalAmount = comparable?.totalAmount ?? 0
    const prevTotalAmount = prev?.totalAmount ?? 0
    const yoyRatio = prevTotalAmount > 0 ? comparableTotalAmount / prevTotalAmount : null
    const yoyDiff = prevTotalAmount > 0 ? comparableTotalAmount - prevTotalAmount : null

    // 数量ベースの前年比 KPI
    const comparableTotalQuantity = comparable?.totalQuantity ?? 0
    const prevTotalQuantity = prev?.totalQuantity ?? 0
    const yoyQuantityRatio = prevTotalQuantity > 0 ? comparableTotalQuantity / prevTotalQuantity : null
    const yoyQuantityDiff = prevTotalQuantity > 0 ? comparableTotalQuantity - prevTotalQuantity : null

    // 数量ベースのピーク
    let peakHourQty = 0, peakHourQuantity = 0
    for (const [h, v] of current.hourly) {
      if (v.quantity > peakHourQuantity) { peakHourQty = h; peakHourQuantity = v.quantity * div }
    }
    const peakHourQtyPct = current.totalQuantity > 0 ? (peakHourQuantity / current.totalQuantity * 100).toFixed(1) : '0'

    // コアタイム & 折り返し時間帯（金額ベース）
    const amountMap = new Map<number, number>()
    for (const [h, v] of current.hourly) amountMap.set(h, v.amount * div)
    const coreTimeAmt = findCoreTime(amountMap)
    const turnaroundAmt = findTurnaroundHour(amountMap)
    const coreTimePct = totalAmount > 0 && coreTimeAmt ? (coreTimeAmt.total / totalAmount * 100).toFixed(1) : '0'

    // コアタイム & 折り返し時間帯（数量ベース）
    const qtyMap = new Map<number, number>()
    for (const [h, v] of current.hourly) qtyMap.set(h, v.quantity * div)
    const coreTimeQty = findCoreTime(qtyMap)
    const turnaroundQty = findTurnaroundHour(qtyMap)
    const coreTimeQtyPct = current.totalQuantity > 0 && coreTimeQty ? (coreTimeQty.total / current.totalQuantity * 100).toFixed(1) : '0'

    return {
      chartData,
      kpi: current.recordCount > 0 ? {
        totalAmount,
        totalQuantity: current.totalQuantity,
        peakHour,
        peakHourPct,
        peakHourQty,
        peakHourQtyPct,
        coreTimeAmt,
        coreTimePct,
        turnaroundAmt,
        coreTimeQty,
        coreTimeQtyPct,
        turnaroundQty,
        recordCount: current.recordCount,
        prevTotalAmount,
        prevTotalQuantity,
        yoyRatio,
        yoyDiff,
        yoyQuantityRatio,
        yoyQuantityDiff,
        activeHours: current.hourly.size,
        avgPerHour: current.hourly.size > 0 ? Math.round(totalAmount / current.hourly.size) : 0,
        avgQtyPerHour: current.hourly.size > 0 ? Math.round(current.totalQuantity / current.hourly.size) : 0,
      } : null,
    }
  }, [current, comparable, prev, div])

  if (chartData.length === 0) return null

  const showPrev = hasPrevYear && showPrevYear

  return (
    <Wrapper>
      <HeaderRow>
        <Title>
          時間帯別{metricMode === 'amount' ? '売上' : '数量'}{viewMode === 'kpi' ? ' サマリー' : ''}
          {pf.mode === 'dailyAvg' ? '（日平均）' : pf.mode === 'dowAvg' ? '（曜日別平均）' : ''}
        </Title>
        <Controls>
          <TabGroup>
            <Tab $active={metricMode === 'amount'} onClick={() => setMetricMode('amount')}>金額</Tab>
            <Tab $active={metricMode === 'quantity'} onClick={() => setMetricMode('quantity')}>点数</Tab>
          </TabGroup>
          {hasPrevYear && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={showPrevYear} onClick={() => setShowPrevYear(!showPrevYear)}>前年比較</Tab>
              </TabGroup>
            </>
          )}
          <Separator />
          <TabGroup>
            <Tab $active={viewMode === 'chart'} onClick={() => setViewMode('chart')}>チャート</Tab>
            <Tab $active={viewMode === 'kpi'} onClick={() => setViewMode('kpi')}>KPI</Tab>
          </TabGroup>
        </Controls>
      </HeaderRow>
      {viewMode === 'chart' ? (
        <div style={{ width: '100%', height: 340 }}>
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
                tickFormatter={metricMode === 'amount' ? toManYen : (v: number) => toComma(v)}
                width={50}
              />
              {/* 右軸: 前年比較なしの場合のみ、もう一方の指標用に表示 */}
              {!showPrev && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={metricMode === 'amount' ? (v: number) => toComma(v) : toManYen}
                  width={45}
                />
              )}
              <Tooltip
                contentStyle={tooltipStyle(ct)}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? '当年売上' : '売上金額',
                    quantity: showPrev ? '当年数量' : '数量',
                    prevAmount: '前年売上',
                    prevQuantity: '前年数量',
                  }
                  const label = labels[name as string] ?? String(name)
                  if (name === 'amount' || name === 'prevAmount') return [toComma(value as number) + '円', label]
                  return [toComma(value as number) + '点', label]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? '当年売上' : '売上金額',
                    quantity: showPrev ? '当年数量' : '数量',
                    prevAmount: '前年売上',
                    prevQuantity: '前年数量',
                  }
                  return labels[value] ?? value
                }}
              />
              {/* メインバー: 選択指標 */}
              <Bar
                yAxisId="left"
                dataKey={metricMode}
                fill={metricMode === 'amount' ? 'url(#timeAmtGrad)' : 'url(#timeQtyGrad)'}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              {/* 前年比較なし: もう一方の指標をサブバーで表示 */}
              {!showPrev && (
                <Bar
                  yAxisId="right"
                  dataKey={metricMode === 'amount' ? 'quantity' : 'amount'}
                  fill={metricMode === 'amount' ? 'url(#timeQtyGrad)' : 'url(#timeAmtGrad)'}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
              )}
              {/* 前年比較: 前年の同指標をラインで表示 */}
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
      ) : kpi ? (
        <Grid>
          {metricMode === 'amount' ? (
            <>
              <Card $accent="#6366f1">
                <CardLabel>当年 総売上金額</CardLabel>
                <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>
                  {kpi.totalAmount.toLocaleString()}円
                  {kpi.yoyRatio != null && (
                    <YoYBadge $positive={kpi.yoyRatio >= 1}>
                      {kpi.yoyRatio >= 1 ? '+' : ''}{((kpi.yoyRatio - 1) * 100).toFixed(1)}%
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {kpi.prevTotalAmount > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>前年 総売上金額</CardLabel>
                  <CardValue>{Math.round(kpi.prevTotalAmount / 10000).toLocaleString()}万円</CardValue>
                  <CardSub>{kpi.prevTotalAmount.toLocaleString()}円</CardSub>
                </Card>
              )}
              {kpi.yoyDiff != null && (
                <Card $accent={kpi.yoyDiff >= 0 ? '#22c55e' : '#ef4444'}>
                  <CardLabel>前年差（金額）</CardLabel>
                  <CardValue style={{ color: kpi.yoyDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {kpi.yoyDiff >= 0 ? '+' : ''}{Math.round(kpi.yoyDiff / 10000).toLocaleString()}万円
                  </CardValue>
                  <CardSub>前年比 {((kpi.yoyRatio ?? 0) * 100).toFixed(1)}%</CardSub>
                </Card>
              )}
              <Card $accent="#06b6d4">
                <CardLabel>総数量</CardLabel>
                <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>{kpi.recordCount.toLocaleString()}レコード</CardSub>
              </Card>
              <Card $accent="#f59e0b">
                <CardLabel>ピーク時間帯</CardLabel>
                <CardValue>{kpi.peakHour}時台</CardValue>
                <CardSub>構成比 {kpi.peakHourPct}%</CardSub>
              </Card>
              <Card $accent="#8b5cf6">
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeAmt)}</CardValue>
                <CardSub>構成比 {kpi.coreTimePct}%</CardSub>
              </Card>
              <Card $accent="#ef4444">
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
              <Card $accent="#06b6d4">
                <CardLabel>当年 総数量</CardLabel>
                <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>
                  {kpi.recordCount.toLocaleString()}レコード
                  {kpi.yoyQuantityRatio != null && (
                    <YoYBadge $positive={kpi.yoyQuantityRatio >= 1}>
                      {kpi.yoyQuantityRatio >= 1 ? '+' : ''}{((kpi.yoyQuantityRatio - 1) * 100).toFixed(1)}%
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {kpi.prevTotalQuantity > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>前年 総数量</CardLabel>
                  <CardValue>{kpi.prevTotalQuantity.toLocaleString()}点</CardValue>
                </Card>
              )}
              {kpi.yoyQuantityDiff != null && (
                <Card $accent={kpi.yoyQuantityDiff >= 0 ? '#22c55e' : '#ef4444'}>
                  <CardLabel>前年差（数量）</CardLabel>
                  <CardValue style={{ color: kpi.yoyQuantityDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {kpi.yoyQuantityDiff >= 0 ? '+' : ''}{kpi.yoyQuantityDiff.toLocaleString()}点
                  </CardValue>
                  <CardSub>前年比 {((kpi.yoyQuantityRatio ?? 0) * 100).toFixed(1)}%</CardSub>
                </Card>
              )}
              <Card $accent="#6366f1">
                <CardLabel>総売上金額</CardLabel>
                <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>{kpi.totalAmount.toLocaleString()}円</CardSub>
              </Card>
              <Card $accent="#f59e0b">
                <CardLabel>ピーク時間帯</CardLabel>
                <CardValue>{kpi.peakHourQty}時台</CardValue>
                <CardSub>構成比 {kpi.peakHourQtyPct}%</CardSub>
              </Card>
              <Card $accent="#8b5cf6">
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeQty)}</CardValue>
                <CardSub>構成比 {kpi.coreTimeQtyPct}%</CardSub>
              </Card>
              <Card $accent="#ef4444">
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
      ) : null}
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
