import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import { findCoreTime, findTurnaroundHour, formatCoreTime, formatTurnaroundHour } from './timeSlotUtils'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, useHierarchyDropdown, HierarchyDropdowns, computeDivisor, countDistinctDays, filterByStore, type AggregateMode } from './PeriodFilter'
import { queryByDateRange } from '@/application/usecases/categoryTimeSales'

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

/* YoY comparison view */
const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const MetricLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

const MetricValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const ProgressBarWrap = styled.div`
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: 4px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 150)}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.6s ease;
`

const ProgressLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

const TableWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
`

const MiniTh = styled.th`
  text-align: center;
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: left; }
`

const MiniTd = styled.td<{ $highlight?: boolean; $positive?: boolean }>`
  text-align: center;
  padding: 2px 5px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  white-space: nowrap;
  color: ${({ $highlight, $positive, theme }) =>
    $highlight
      ? $positive ? '#22c55e' : '#ef4444'
      : theme.colors.text2};
  &:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    color: ${({ theme }) => theme.colors.text2};
  }
`

type ViewMode = 'chart' | 'kpi' | 'yoy'
type MetricMode = 'amount' | 'quantity'

interface Props {
  /** 分類別時間帯売上インデックス（当年） */
  ctsIndex: CategoryTimeSalesIndex
  /** 分類別時間帯売上インデックス（前年、同曜日オフセット適用済み） */
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/**
 * 時間帯別の集計結果を計算する共通関数。
 *
 * ## 除数の算出方法（重要）
 *
 * カレンダーベースの日数（例: 2月=28日）ではなく、実際にデータが存在する
 * distinct day 数をカウントして除数とする。これにより以下のケースを正しく処理:
 *
 * - データ欠損日（店休日、データ未投入日）が除数に含まれない
 * - 期間途中のデータ追加でも正確な平均が算出される
 * - 当年/前年でデータカバレッジが異なる場合、各々の実データ日数で除算
 *
 * @returns hourly: 時間帯別集計（除算済み）, totalAmount/totalQuantity: 生合計,
 *          recordCount: レコード数, divisor: 使用した除数
 */
function aggregateHourly(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
  filter: ReturnType<typeof useCategoryHierarchy>['filter'],
  hf: ReturnType<typeof useHierarchyDropdown>,
  mode: AggregateMode,
) {
  const hourly = new Map<number, { amount: number; quantity: number }>()
  const storeFiltered = filterByStore(hf.applyFilter(filterByHierarchy(records, filter)), selectedStoreIds)

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

  const div = computeDivisor(countDistinctDays(storeFiltered), mode)
  const result = new Map<number, { amount: number; quantity: number }>()
  for (const [h, v] of hourly) {
    result.set(h, { amount: Math.round(v.amount / div), quantity: Math.round(v.quantity / div) })
  }

  return { hourly: result, totalAmount, totalQuantity, recordCount: storeFiltered.length, divisor: div }
}

/** 時間帯別売上チャート（チャート / KPIサマリー 切替、前年比較・前週比較対応） */
export function TimeSlotSalesChart({ ctsIndex, prevCtsIndex, selectedStoreIds, daysInMonth, year, month, dataMaxDay }: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { filter } = useCategoryHierarchy()
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [showPrevYear, setShowPrevYear] = useState(true)
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)

  // ── DateRange ベースのレコード取得 ──
  const sliderDateRange: DateRange = useMemo(() => ({
    from: { year, month, day: pf.dayRange[0] },
    to: { year, month, day: pf.dayRange[1] },
  }), [year, month, pf.dayRange])

  const dowFilter = pf.mode === 'dowAvg' && pf.selectedDows.size > 0 ? pf.selectedDows : undefined

  const periodRecords = useMemo(
    () => queryByDateRange(ctsIndex, { dateRange: sliderDateRange, dow: dowFilter }),
    [ctsIndex, sliderDateRange, dowFilter],
  )

  // WoW: 前週期間 (dayRange を -7 日シフト)
  const wowPrevStart = pf.dayRange[0] - 7
  const wowPrevEnd = pf.dayRange[1] - 7
  const canWoW = wowPrevStart >= 1
  // canWoW が false なら yoy にフォールバック（派生状態）
  const activeCompMode = compMode === 'wow' && !canWoW ? 'yoy' as const : compMode

  // 比較期間レコード（前年比 or 前週比で切替）
  const prevPeriodRecords = useMemo(() => {
    if (activeCompMode === 'wow') {
      const wowRange: DateRange = {
        from: { year, month, day: wowPrevStart },
        to: { year, month, day: wowPrevEnd },
      }
      return queryByDateRange(ctsIndex, { dateRange: wowRange })
    }
    if (prevCtsIndex.recordCount === 0) return [] as readonly CategoryTimeSalesRecord[]
    // 前年インデックスのレコードは year=前年 のまま。dayRange のみ合わせる。
    const prevRange: DateRange = {
      from: { year: year - 1, month, day: pf.dayRange[0] },
      to: { year: year - 1, month, day: pf.dayRange[1] },
    }
    let recs = queryByDateRange(prevCtsIndex, { dateRange: prevRange })
    // DOWフィルタ: 前年レコードの day は同曜日オフセット済みなので、
    // 当年の year/month で曜日を算出する（前年自身の year/month では不正確）
    if (dowFilter) {
      recs = recs.filter((r) => {
        const dow = new Date(year, month - 1, r.day).getDay()
        return dowFilter.has(dow)
      })
    }
    return recs
  }, [activeCompMode, ctsIndex, prevCtsIndex, year, month, pf.dayRange, wowPrevStart, wowPrevEnd, dowFilter])

  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0

  // 動的ラベル
  const prevLbl = activeCompMode === 'wow' ? '前週' : '前年'
  const curLbl = activeCompMode === 'wow' ? '当週' : '当年'

  // 比較期間データがカバーする日の集合（日数一致比較用）
  const prevDaySet = useMemo(
    () => new Set(prevPeriodRecords.map((r) => r.day)),
    [prevPeriodRecords],
  )
  // 比較期間と重複する日のみの当年レコード（分母分子を揃える）
  const comparablePeriodRecords = useMemo(
    () => {
      if (!hasPrevYear) return periodRecords
      if (activeCompMode === 'wow') return periodRecords // WoW: both periods same coverage
      return periodRecords.filter((r) => prevDaySet.has(r.day))
    },
    [periodRecords, prevDaySet, hasPrevYear, activeCompMode],
  )

  const current = useMemo(
    () => aggregateHourly(periodRecords, selectedStoreIds, filter, hf, pf.mode),
    [periodRecords, selectedStoreIds, filter, hf, pf.mode],
  )
  const comparable = useMemo(
    () => hasPrevYear ? aggregateHourly(comparablePeriodRecords, selectedStoreIds, filter, hf, pf.mode) : null,
    [comparablePeriodRecords, selectedStoreIds, filter, hf, pf.mode, hasPrevYear],
  )
  const prev = useMemo(
    () => hasPrevYear ? aggregateHourly(prevPeriodRecords, selectedStoreIds, filter, hf, pf.mode) : null,
    [prevPeriodRecords, selectedStoreIds, filter, hf, pf.mode, hasPrevYear],
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

    // KPI — current.divisor は実データの distinct day 数から算出された除数
    const curDiv = current.divisor
    let peakHour = 0, peakHourAmount = 0
    for (const [h, v] of current.hourly) {
      if (v.amount > peakHourAmount) { peakHour = h; peakHourAmount = v.amount * curDiv }
    }
    const totalAmount = current.totalAmount
    const peakHourPct = totalAmount > 0 ? toPct(peakHourAmount / totalAmount) : '0%'

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
      if (v.quantity > peakHourQuantity) { peakHourQty = h; peakHourQuantity = v.quantity * curDiv }
    }
    const peakHourQtyPct = current.totalQuantity > 0 ? toPct(peakHourQuantity / current.totalQuantity) : '0%'

    // コアタイム & 折り返し時間帯（金額ベース）— 生値で計算するため除数を掛け戻す
    const amountMap = new Map<number, number>()
    for (const [h, v] of current.hourly) amountMap.set(h, v.amount * curDiv)
    const coreTimeAmt = findCoreTime(amountMap)
    const turnaroundAmt = findTurnaroundHour(amountMap)
    const coreTimePct = totalAmount > 0 && coreTimeAmt ? toPct(coreTimeAmt.total / totalAmount) : '0%'

    // コアタイム & 折り返し時間帯（数量ベース）
    const qtyMap = new Map<number, number>()
    for (const [h, v] of current.hourly) qtyMap.set(h, v.quantity * curDiv)
    const coreTimeQty = findCoreTime(qtyMap)
    const turnaroundQty = findTurnaroundHour(qtyMap)
    const coreTimeQtyPct = current.totalQuantity > 0 && coreTimeQty ? toPct(coreTimeQty.total / current.totalQuantity) : '0%'

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
  }, [current, comparable, prev])

  // YoY comparison data (per-hour diff + summary + table rows)
  const yoyData = useMemo(() => {
    if (!comparable || !prev) return null

    const allHours = new Set([...comparable.hourly.keys(), ...prev.hourly.keys()])
    const hours = [...allHours].sort((a, b) => a - b)

    const rows = hours.map((h) => {
      const cur = comparable.hourly.get(h)?.amount ?? 0
      const prv = prev.hourly.get(h)?.amount ?? 0
      const diff = cur - prv
      const ratio = prv > 0 ? cur / prv : null
      return { hour: `${h}時`, current: cur, prevYear: prv, diff, ratio }
    })

    const curTotal = comparable.totalAmount
    const prevTotal = prev.totalAmount
    const yoyRatio = prevTotal > 0 ? curTotal / prevTotal : null
    const yoyDiff = curTotal - prevTotal

    let maxIncHour = -1, maxIncDiff = 0
    let maxDecHour = -1, maxDecDiff = 0
    for (const d of rows) {
      if (d.diff > maxIncDiff) { maxIncDiff = d.diff; maxIncHour = parseInt(d.hour) }
      if (d.diff < maxDecDiff) { maxDecDiff = d.diff; maxDecHour = parseInt(d.hour) }
    }

    // Raw hourly maps for coreTime calculation
    const curHourlyRaw = new Map<number, number>()
    const prevHourlyRaw = new Map<number, number>()
    for (const [h, v] of comparable.hourly) curHourlyRaw.set(h, v.amount * comparable.divisor)
    for (const [h, v] of prev.hourly) prevHourlyRaw.set(h, v.amount * prev.divisor)

    return {
      rows,
      chartData: rows,
      summary: {
        curTotal, prevTotal, yoyRatio, yoyDiff,
        maxIncHour, maxIncDiff, maxDecHour, maxDecDiff,
        curCoreTime: findCoreTime(curHourlyRaw),
        curTurnaround: findTurnaroundHour(curHourlyRaw),
        prevCoreTime: findCoreTime(prevHourlyRaw),
        prevTurnaround: findTurnaroundHour(prevHourlyRaw),
      },
    }
  }, [comparable, prev])

  if (chartData.length === 0) return null

  const showPrev = hasPrevYear && showPrevYear

  const titleText = viewMode === 'yoy'
    ? `時間帯別 ${prevLbl}同曜日比較`
    : `時間帯別${metricMode === 'amount' ? '売上' : '数量'}${viewMode === 'kpi' ? ' サマリー' : ''}`
  const modeLabel = pf.mode === 'dailyAvg' ? '（日平均）' : pf.mode === 'dowAvg' ? '（曜日別平均）' : ''

  return (
    <Wrapper>
      <HeaderRow>
        <Title>{titleText}{modeLabel}</Title>
        <Controls>
          {viewMode !== 'yoy' && (
            <TabGroup>
              <Tab $active={metricMode === 'amount'} onClick={() => setMetricMode('amount')}>金額</Tab>
              <Tab $active={metricMode === 'quantity'} onClick={() => setMetricMode('quantity')}>点数</Tab>
            </TabGroup>
          )}
          {hasPrevYear && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>前年比</Tab>
                <Tab $active={compMode === 'wow'} onClick={() => { if (canWoW) setCompMode('wow') }} style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}>前週比</Tab>
              </TabGroup>
            </>
          )}
          {hasPrevYear && viewMode === 'chart' && (
            <>
              <Separator />
              <TabGroup>
                <Tab $active={showPrevYear} onClick={() => setShowPrevYear(!showPrevYear)}>{prevLbl}比較</Tab>
              </TabGroup>
            </>
          )}
          <Separator />
          <TabGroup>
            <Tab $active={viewMode === 'chart'} onClick={() => setViewMode('chart')}>チャート</Tab>
            <Tab $active={viewMode === 'kpi'} onClick={() => setViewMode('kpi')}>KPI</Tab>
            {hasPrevYear && (
              <Tab $active={viewMode === 'yoy'} onClick={() => setViewMode('yoy')}>{prevLbl}比較</Tab>
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
                tickFormatter={metricMode === 'amount' ? fmt : (v: number) => toComma(v)}
                width={50}
              />
              {!showPrev && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={metricMode === 'amount' ? (v: number) => toComma(v) : fmt}
                  width={45}
                />
              )}
              <Tooltip
                contentStyle={tooltipStyle(ct)}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    amount: showPrev ? `${curLbl}売上` : '売上金額',
                    quantity: showPrev ? `${curLbl}数量` : '数量',
                    prevAmount: `${prevLbl}売上`,
                    prevQuantity: `${prevLbl}数量`,
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
              <Card $accent="#6366f1">
                <CardLabel>{curLbl} 総売上金額</CardLabel>
                <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
                <CardSub>
                  {kpi.totalAmount.toLocaleString()}円
                  {kpi.yoyRatio != null && (
                    <YoYBadge $positive={kpi.yoyRatio >= 1}>
                      {kpi.yoyRatio >= 1 ? '+' : ''}{toPct(kpi.yoyRatio - 1)}
                    </YoYBadge>
                  )}
                </CardSub>
              </Card>
              {kpi.prevTotalAmount > 0 && (
                <Card $accent={ct.colors.slate}>
                  <CardLabel>{prevLbl} 総売上金額</CardLabel>
                  <CardValue>{Math.round(kpi.prevTotalAmount / 10000).toLocaleString()}万円</CardValue>
                  <CardSub>{kpi.prevTotalAmount.toLocaleString()}円</CardSub>
                </Card>
              )}
              {kpi.yoyDiff != null && (
                <Card $accent={kpi.yoyDiff >= 0 ? '#22c55e' : '#ef4444'}>
                  <CardLabel>{prevLbl}差（金額）</CardLabel>
                  <CardValue style={{ color: kpi.yoyDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {kpi.yoyDiff >= 0 ? '+' : ''}{Math.round(kpi.yoyDiff / 10000).toLocaleString()}万円
                  </CardValue>
                  <CardSub>{prevLbl}比 {toPct(kpi.yoyRatio ?? 0)}</CardSub>
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
                <CardSub>構成比 {kpi.peakHourPct}</CardSub>
              </Card>
              <Card $accent="#8b5cf6">
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeAmt)}</CardValue>
                <CardSub>構成比 {kpi.coreTimePct}</CardSub>
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
                <CardLabel>{curLbl} 総数量</CardLabel>
                <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
                <CardSub>
                  {kpi.recordCount.toLocaleString()}レコード
                  {kpi.yoyQuantityRatio != null && (
                    <YoYBadge $positive={kpi.yoyQuantityRatio >= 1}>
                      {kpi.yoyQuantityRatio >= 1 ? '+' : ''}{toPct(kpi.yoyQuantityRatio - 1)}
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
                <Card $accent={kpi.yoyQuantityDiff >= 0 ? '#22c55e' : '#ef4444'}>
                  <CardLabel>{prevLbl}差（数量）</CardLabel>
                  <CardValue style={{ color: kpi.yoyQuantityDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {kpi.yoyQuantityDiff >= 0 ? '+' : ''}{kpi.yoyQuantityDiff.toLocaleString()}点
                  </CardValue>
                  <CardSub>{prevLbl}比 {toPct(kpi.yoyQuantityRatio ?? 0)}</CardSub>
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
                <CardSub>構成比 {kpi.peakHourQtyPct}</CardSub>
              </Card>
              <Card $accent="#8b5cf6">
                <CardLabel>コアタイム</CardLabel>
                <CardValue>{formatCoreTime(kpi.coreTimeQty)}</CardValue>
                <CardSub>構成比 {kpi.coreTimeQtyPct}</CardSub>
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
      )}

      {/* ── YoY comparison view ── */}
      {viewMode === 'yoy' && yoyData && (() => {
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
                    <span>{prevLbl}比 {toPct(s.yoyRatio)}</span>
                    <span>{s.yoyDiff >= 0 ? '+' : ''}{fmt(s.yoyDiff)}円</span>
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
                  <MetricValue $color="#22c55e">{s.maxIncHour}時 (+{fmt(s.maxIncDiff)})</MetricValue>
                </Metric>
              )}
              {s.maxDecHour >= 0 && (
                <Metric>
                  <MetricLabel>最大減少時間帯</MetricLabel>
                  <MetricValue $color="#ef4444">{s.maxDecHour}時 ({fmt(s.maxDecDiff)})</MetricValue>
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
                  <MetricValue $color={ct.colors.slate}>{formatCoreTime(s.prevCoreTime)}</MetricValue>
                </Metric>
              )}
              {s.prevTurnaround != null && (
                <Metric>
                  <MetricLabel>折り返し（{prevLbl}）</MetricLabel>
                  <MetricValue $color={ct.colors.slate}>{formatTurnaroundHour(s.prevTurnaround)}</MetricValue>
                </Metric>
              )}
            </SummaryRow>

            <div style={{ width: '100%', height: 300, minHeight: 0 }}>
              <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                <ComposedChart data={yoyData.chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yoyCurGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
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
                    tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmt}
                    width={50}
                  />
                  <ReferenceLine y={0} stroke={ct.grid} />
                  <Tooltip
                    contentStyle={tooltipStyle(ct)}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const labels: Record<string, string> = { current: curLbl, prevYear: `${prevLbl}同曜日`, diff: '差分' }
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
                      const labels: Record<string, string> = { current: curLbl, prevYear: `${prevLbl}同曜日`, diff: '差分' }
                      return labels[value] ?? value
                    }}
                  />
                  <Bar dataKey="current" fill="url(#yoyCurGrad)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Line type="monotone" dataKey="prevYear" stroke={ct.colors.slate} strokeWidth={2.5} strokeDasharray="5 3" dot={false} connectNulls />
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
                          {isPositive ? '+' : ''}{toComma(row.diff)}円
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

      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
