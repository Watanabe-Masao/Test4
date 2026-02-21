import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { safeDivide, calculateTransactionValue, calculateMovingAverage } from '@/domain/calculations'

const Wrapper = styled.div`
  width: 100%;
  height: 400px;
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
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.text3};
  background: ${({ $active, theme }) => $active
    ? theme.colors.palette.primary
    : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) => $active
      ? theme.colors.palette.primary
      : theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
`

const Sep = styled.span`
  opacity: 0.4;
  padding: 3px 2px;
  cursor: default;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text4};
`

export type DailyChartMode = 'sales' | 'discount' | 'all'

/** 表示形式 */
type ViewType = 'standard' | 'salesOnly' | 'discountOnly' | 'movingAvg' | 'area' | 'customers' | 'txValue' | 'prevYearCum' | 'discountImpact'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
  mode?: DailyChartMode
}

/** N日移動平均を計算（ドメイン層のユーティリティに委譲） */
function movingAverage(values: number[], window: number): (number | null)[] {
  return calculateMovingAverage(values, window).map((v) => (isNaN(v) ? null : v))
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  salesOnly: '売上',
  discountOnly: '売変',
  discountImpact: '売変分析',
  customers: '客数',
  txValue: '客単価',
  prevYearCum: '前年比累計',
  movingAvg: '移動平均',
  area: 'エリア',
}

const VIEW_TITLES: Record<ViewType, string> = {
  standard: '日別売上・売変推移',
  salesOnly: '日別売上推移（当年 vs 前年）',
  discountOnly: '日別売変推移（当年 vs 前年）',
  discountImpact: '売変インパクト分析（バー: 日別売変額 / ライン: 累計売変率）',
  customers: '日別客数・客単価推移',
  txValue: '日別客単価推移',
  prevYearCum: '当年 vs 前年同曜日（累計売上推移）',
  movingAvg: '7日移動平均推移',
  area: '日別売上推移（エリア）',
}

const WF_TITLES: Record<string, string> = {
  standard: '日別売上ウォーターフォール（前日比増減）',
  salesOnly: '日別売上ウォーターフォール（前日比増減）',
  discountOnly: '日別売変ウォーターフォール（前日比増減）',
  customers: '日別客数ウォーターフォール（前日比増減）',
}

const MODE_TO_VIEW: Record<DailyChartMode, ViewType> = {
  all: 'standard',
  sales: 'salesOnly',
  discount: 'discountOnly',
}

/** ウォーターフォール対応ビュー */
const WF_VIEWS: ViewType[] = ['standard', 'salesOnly', 'discountOnly', 'customers']

export function DailySalesChart({ daily, daysInMonth, prevYearDaily, mode = 'all' }: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>(() => MODE_TO_VIEW[mode])
  const [showSalesMa, setShowSalesMa] = useState(false)
  const [waterfall, setWaterfall] = useState(false)
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const isWf = waterfall && WF_VIEWS.includes(view)

  // 全データ計算を一つのuseMemoに統合
  const { baseData, salesMa7, discountMa7, prevDiscountMa7, wfData } = useMemo(() => {
    const rawSales: number[] = []
    const rawDiscount: number[] = []
    const rawPrevDiscount: number[] = []
    let cumSales = 0, cumPrevSales = 0, cumDiscount = 0, cumGrossSales = 0
    const bd: {
      day: number; sales: number; discount: number; prevYearSales: number | null; prevYearDiscount: number | null
      customers: number; txValue: number | null; prevCustomers: number | null
      prevTxValue: number | null; currentCum: number; prevYearCum: number | null; cumDiscountRate: number
    }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const sales = rec?.sales ?? 0
      const discount = rec?.discountAbsolute ?? 0
      const grossSales = rec?.grossSales ?? 0
      rawSales.push(sales)
      rawDiscount.push(discount)
      const prevEntry = prevYearDaily?.get(d)
      const prevSales = prevEntry?.sales ?? null
      const prevDiscount = prevEntry?.discount ?? null
      rawPrevDiscount.push(prevEntry?.discount ?? 0)
      const customers = rec?.customers ?? 0
      const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
      const prevCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
      const pySales = prevEntry?.sales ?? 0
      const pyCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
      const prevTxValue = pyCustomers > 0 ? calculateTransactionValue(pySales, pyCustomers) : null

      // 累計系
      cumSales += sales
      cumPrevSales += prevEntry?.sales ?? 0
      cumDiscount += discount
      cumGrossSales += grossSales
      const cumDiscountRate = safeDivide(cumDiscount, cumGrossSales, 0)

      bd.push({
        day: d, sales, discount, prevYearSales: prevSales, prevYearDiscount: prevDiscount,
        customers, txValue, prevCustomers: prevCustomers > 0 ? prevCustomers : null,
        prevTxValue, currentCum: cumSales, prevYearCum: cumPrevSales > 0 ? cumPrevSales : null,
        cumDiscountRate,
      })
    }

    // 7日移動平均
    const sMa7 = movingAverage(rawSales, 7)
    const dMa7 = movingAverage(rawDiscount, 7)
    const pdMa7 = movingAverage(rawPrevDiscount, 7)

    // ウォーターフォールデータ（前日比増減）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wf: any[] | null = null
    if (isWf) {
      let wfCumSales = 0, wfCumDiscount = 0, wfCumCustomers = 0
      wf = bd.map((d, i) => {
        const salesChange = i === 0 ? d.sales : d.sales - bd[i - 1].sales
        const discountChange = i === 0 ? d.discount : d.discount - bd[i - 1].discount
        const customersChange = i === 0 ? d.customers : d.customers - bd[i - 1].customers

        const wfSalesBase = salesChange >= 0 ? wfCumSales : wfCumSales + salesChange
        const wfSalesUp = salesChange >= 0 ? salesChange : 0
        const wfSalesDown = salesChange < 0 ? Math.abs(salesChange) : 0
        wfCumSales += salesChange

        const wfDiscBase = discountChange >= 0 ? wfCumDiscount : wfCumDiscount + discountChange
        const wfDiscUp = discountChange >= 0 ? discountChange : 0
        const wfDiscDown = discountChange < 0 ? Math.abs(discountChange) : 0
        wfCumDiscount += discountChange

        const wfCustBase = customersChange >= 0 ? wfCumCustomers : wfCumCustomers + customersChange
        const wfCustUp = customersChange >= 0 ? customersChange : 0
        const wfCustDown = customersChange < 0 ? Math.abs(customersChange) : 0
        wfCumCustomers += customersChange

        return {
          ...d,
          wfSalesBase, wfSalesUp, wfSalesDown, wfSalesCum: wfCumSales,
          wfDiscBase, wfDiscUp, wfDiscDown, wfDiscCum: wfCumDiscount,
          wfCustBase, wfCustUp, wfCustDown, wfCustCum: wfCumCustomers,
          salesMa7: sMa7[i], discountMa7: dMa7[i], prevDiscountMa7: pdMa7[i],
        }
      })
    }

    return { baseData: bd, salesMa7: sMa7, discountMa7: dMa7, prevDiscountMa7: pdMa7, wfData: wf }
  }, [daily, daysInMonth, prevYearDaily, isWf])

  const data = isWf && wfData
    ? wfData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)
    : baseData.map((d, i) => ({
        ...d,
        salesMa7: salesMa7[i],
        discountMa7: discountMa7[i],
        prevDiscountMa7: prevDiscountMa7[i],
      })).filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  const hasPrev = !!prevYearDaily

  const allLabels: Record<string, string> = {
    sales: '売上', prevYearSales: '前年同曜日売上',
    discount: '売変額', prevYearDiscount: '前年売変額',
    salesMa7: '売上7日移動平均', discountMa7: '売変額7日移動平均', prevDiscountMa7: '前年売変7日移動平均',
    customers: '客数', prevCustomers: '前年客数', txValue: '当年客単価', prevTxValue: '前年客単価',
    currentCum: '当年累計', prevYearCum: '前年同曜日累計',
    cumDiscountRate: '累計売変率',
    wfSalesUp: '増加', wfSalesDown: '減少',
    wfDiscUp: '増加', wfDiscDown: '減少',
    wfCustUp: '増加', wfCustDown: '減少',
  }

  // 右Y軸が必要か
  const needRightAxis = !isWf && (view === 'standard' || view === 'discountOnly' || view === 'customers' || view === 'discountImpact' || (view === 'movingAvg' && showSalesMa))

  const titleText = isWf ? (WF_TITLES[view] ?? VIEW_TITLES[view]) : VIEW_TITLES[view]

  // ウォーターフォール凡例
  const wfLegendPayload = isWf ? (() => {
    const prefix = view === 'customers' ? 'wfCust' : view === 'discountOnly' ? 'wfDisc' : 'wfSales'
    return [
      { value: `${prefix}Up`, type: 'rect' as const, color: ct.colors.success },
      { value: `${prefix}Down`, type: 'rect' as const, color: ct.colors.danger },
    ]
  })() : undefined

  return (
    <Wrapper>
      <HeaderRow>
        <Title>{titleText}</Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
          {view === 'movingAvg' && (
            <>
              <Sep>|</Sep>
              <ViewBtn $active={showSalesMa} onClick={() => setShowSalesMa(v => !v)}>
                売上MA
              </ViewBtn>
            </>
          )}
          {WF_VIEWS.includes(view) && (
            <>
              <Sep>|</Sep>
              <ViewBtn $active={waterfall} onClick={() => setWaterfall(v => !v)}>
                WF
              </ViewBtn>
            </>
          )}
        </ViewToggle>
      </HeaderRow>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="82%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.9} />
              <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="prevSalesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.7} />
              <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.4} />
              <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="prevSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.3} />
              <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={view === 'customers' ? (v: number) => `${v}人` : view === 'txValue' ? (v: number) => `${toComma(v)}円` : toManYen}
            width={view === 'txValue' ? 60 : 50}
          />
          {needRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={view === 'customers' ? (v: number) => `${toComma(v)}円` : view === 'discountImpact' ? (v: number) => `${(v * 100).toFixed(1)}%` : toManYen}
              width={view === 'customers' || view === 'discountImpact' ? 55 : 45}
            />
          )}
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const n = name as string
              if (n.includes('Base') || n === 'wfSalesCum' || n === 'wfDiscCum' || n === 'wfCustCum') return [null, null] as unknown as [string, string]
              if (value == null) return ['-', allLabels[n] ?? String(name)]
              if (n === 'cumDiscountRate') return [`${((value as number) * 100).toFixed(1)}%`, allLabels[n] ?? n]
              const suffix = n === 'customers' || n === 'prevCustomers' || n.includes('Cust') ? '人' : (n === 'txValue' || n === 'prevTxValue') ? '円' : ''
              return [toComma(value as number) + suffix, allLabels[n] ?? n]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
            {...(wfLegendPayload ? { payload: wfLegendPayload as never } : {})}
          />

          {/* ── ウォーターフォール: 売上系 ── */}
          {isWf && (view === 'standard' || view === 'salesOnly') && (
            <>
              <Bar yAxisId="left" dataKey="wfSalesBase" stackId="wfS" fill="transparent" maxBarSize={16} legendType="none" />
              <Bar yAxisId="left" dataKey="wfSalesUp" stackId="wfS" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />)}
              </Bar>
              <Bar yAxisId="left" dataKey="wfSalesDown" stackId="wfS" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="wfSalesCum" stroke={ct.colors.primary} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />
              <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
            </>
          )}

          {/* ── ウォーターフォール: 売変系 ── */}
          {isWf && view === 'discountOnly' && (
            <>
              <Bar yAxisId="left" dataKey="wfDiscBase" stackId="wfD" fill="transparent" maxBarSize={16} legendType="none" />
              <Bar yAxisId="left" dataKey="wfDiscUp" stackId="wfD" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />)}
              </Bar>
              <Bar yAxisId="left" dataKey="wfDiscDown" stackId="wfD" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="wfDiscCum" stroke={ct.colors.dangerDark} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />
              <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
            </>
          )}

          {/* ── ウォーターフォール: 客数系 ── */}
          {isWf && view === 'customers' && (
            <>
              <Bar yAxisId="left" dataKey="wfCustBase" stackId="wfC" fill="transparent" maxBarSize={16} legendType="none" />
              <Bar yAxisId="left" dataKey="wfCustUp" stackId="wfC" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />)}
              </Bar>
              <Bar yAxisId="left" dataKey="wfCustDown" stackId="wfC" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="wfCustCum" stroke={ct.colors.info} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />
              <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
            </>
          )}

          {/* ── Standard: 売上+前年売上=棒、売変+前年売変=点線 ── */}
          {!isWf && view === 'standard' && (
            <>
              <Bar yAxisId="left" dataKey="sales" fill="url(#salesGrad)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              {hasPrev && (
                <Bar yAxisId="left" dataKey="prevYearSales" fill="url(#prevSalesGrad)" radius={[3, 3, 0, 0]} maxBarSize={14} />
              )}
              <Line yAxisId="right" type="monotone" dataKey="discount" stroke={ct.colors.danger} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
              {hasPrev && (
                <Line yAxisId="right" type="monotone" dataKey="prevYearDiscount" stroke={ct.colors.orange} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
              )}
            </>
          )}

          {/* ── Sales Only ── */}
          {!isWf && view === 'salesOnly' && (
            <>
              <Bar yAxisId="left" dataKey="sales" fill="url(#salesGrad)" radius={[3, 3, 0, 0]} maxBarSize={20} />
              {hasPrev && (
                <Bar yAxisId="left" dataKey="prevYearSales" fill="url(#prevSalesGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              )}
              <Line yAxisId="left" type="monotone" dataKey="salesMa7" stroke={ct.colors.cyanDark} strokeWidth={2} dot={false} connectNulls />
            </>
          )}

          {/* ── Discount Only ── */}
          {!isWf && view === 'discountOnly' && (
            <>
              <Bar yAxisId="right" dataKey="discount" fill={ct.colors.danger} radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.7} />
              {hasPrev && (
                <Bar yAxisId="right" dataKey="prevYearDiscount" fill={ct.colors.orange} radius={[3, 3, 0, 0]} maxBarSize={16} opacity={0.5} />
              )}
              <Line yAxisId="right" type="monotone" dataKey="discountMa7" stroke={ct.colors.dangerDark} strokeWidth={2} dot={false} connectNulls />
              {hasPrev && (
                <Line yAxisId="right" type="monotone" dataKey="prevDiscountMa7" stroke={ct.colors.warningDark} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
              )}
            </>
          )}

          {/* ── Moving Average ── */}
          {view === 'movingAvg' && (
            <>
              <Line yAxisId="left" type="monotone" dataKey="discountMa7" stroke={ct.colors.danger} strokeWidth={2} dot={false} connectNulls />
              {hasPrev && (
                <Line yAxisId="left" type="monotone" dataKey="prevDiscountMa7" stroke={ct.colors.orange} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
              )}
              {showSalesMa && (
                <Line yAxisId="right" type="monotone" dataKey="salesMa7" stroke={ct.colors.primary} strokeWidth={2.5} dot={false} connectNulls />
              )}
            </>
          )}

          {/* ── Area ── */}
          {view === 'area' && (
            <>
              <Area yAxisId="left" type="monotone" dataKey="sales" fill="url(#salesAreaGrad)" stroke={ct.colors.primary} strokeWidth={2} />
              {hasPrev && (
                <Area yAxisId="left" type="monotone" dataKey="prevYearSales" fill="url(#prevSalesAreaGrad)" stroke={ct.colors.slate} strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              <Line yAxisId="left" type="monotone" dataKey="salesMa7" stroke={ct.colors.cyanDark} strokeWidth={2} dot={false} connectNulls />
            </>
          )}

          {/* ── Customers ── */}
          {!isWf && view === 'customers' && (
            <>
              <Bar yAxisId="left" dataKey="customers" fill={ct.colors.info} radius={[3, 3, 0, 0]} maxBarSize={18} opacity={0.75} />
              {hasPrev && (
                <Bar yAxisId="left" dataKey="prevCustomers" fill={ct.colors.slate} radius={[3, 3, 0, 0]} maxBarSize={14} opacity={0.5} />
              )}
              <Line yAxisId="right" type="monotone" dataKey="txValue" stroke={ct.colors.purple} strokeWidth={2} dot={false} connectNulls />
            </>
          )}

          {/* ── Transaction Value (客単価) ── */}
          {view === 'txValue' && (
            <>
              <defs>
                <linearGradient id="txValGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.purple} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={ct.colors.purple} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <Bar yAxisId="left" dataKey="txValue" fill="url(#txValGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              {hasPrev && (
                <Line yAxisId="left" type="monotone" dataKey="prevTxValue" stroke={ct.colors.slate} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              )}
            </>
          )}

          {/* ── Prev Year Cumulative (前年比累計) ── */}
          {view === 'prevYearCum' && (
            <>
              <defs>
                <linearGradient id="currentCumArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="prevCumArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area yAxisId="left" type="monotone" dataKey="prevYearCum" stroke={ct.colors.slate} strokeWidth={2} strokeDasharray="4 3" fill="url(#prevCumArea)" dot={false} connectNulls />
              <Area yAxisId="left" type="monotone" dataKey="currentCum" stroke={ct.colors.primary} strokeWidth={2.5} fill="url(#currentCumArea)" dot={false} />
            </>
          )}

          {/* ── Discount Impact (売変インパクト分析) ── */}
          {view === 'discountImpact' && (
            <>
              <defs>
                <linearGradient id="discImpactGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.colors.danger} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={ct.colors.danger} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <Bar yAxisId="left" dataKey="discount" fill="url(#discImpactGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Line yAxisId="right" type="monotone" dataKey="cumDiscountRate" stroke={ct.colors.orange} strokeWidth={2} dot={false} connectNulls />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
