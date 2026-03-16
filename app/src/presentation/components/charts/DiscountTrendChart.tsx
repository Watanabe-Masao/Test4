import { useState, useMemo, memo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, useCurrencyFormat, toComma, toPct, toAxisYen } from './chartTheme'
import {
  Wrapper,
  HeaderRow,
  Title,
  Controls,
  TabGroup,
  Tab,
  KpiGrid,
  KpiCard,
  KpiLabel,
  KpiValue,
  KpiSub,
} from './DiscountTrendChart.styles'
import { createChartTooltip } from './createChartTooltip'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import type { DailyRecord, DiscountEntry } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

/** 売変種別ごとのカラーパレット（DISCOUNT_TYPES の順序に対応） */
const DISCOUNT_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7'] as const

type ViewMode = 'stacked' | 'individual'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  /** 月間売変内訳（StoreResult.discountEntries） */
  discountEntries?: readonly DiscountEntry[]
  /** 月間粗売上 */
  totalGrossSales?: number
  year: number
  month: number
  /** 前年日次データ（売変額の前年比較ライン用） */
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >
}

/** 売変内訳分析チャート（71-74種別切替対応） */
export const DiscountTrendChart = memo(function DiscountTrendChart({
  daily,
  daysInMonth,
  discountEntries,
  totalGrossSales,
  year,
  month,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()
  const { format: fmtCurrency } = useCurrencyFormat()
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [activeCode, setActiveCode] = useState<string>('71')

  const allData = useMemo(() => {
    let cumDiscount = 0
    let cumGrossSales = 0
    let prevCumDiscount = 0
    let prevCumGrossSales = 0
    const result = []
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const dayDiscount = rec?.discountAbsolute ?? 0
      const dayGross = rec?.grossSales ?? 0

      cumDiscount += dayDiscount
      cumGrossSales += dayGross

      const cumRate = calculateShare(cumDiscount, cumGrossSales)

      // 前年売変比較
      const prevEntry = prevYearDaily?.get(toDateKeyFromParts(year, month, d))
      const prevDayDiscount = prevEntry?.discount ?? 0
      prevCumDiscount += prevDayDiscount
      // 前年粗売上は不明なので売上で近似（データソースの制約）
      prevCumGrossSales += prevEntry?.sales ?? 0
      const prevCumRate =
        prevCumGrossSales > 0 ? calculateShare(prevCumDiscount, prevCumGrossSales) : null

      const entry: Record<string, number | boolean | null> = {
        day: d,
        discount: dayDiscount,
        cumRate,
        prevDiscount: prevYearDaily ? prevDayDiscount : null,
        prevCumRate: prevYearDaily ? prevCumRate : null,
        hasSales: rec ? rec.sales > 0 : false,
      }
      if (rec?.discountEntries) {
        for (const de of rec.discountEntries) {
          entry[`d${de.type}`] = de.amount
        }
      } else {
        for (const dt of DISCOUNT_TYPES) {
          entry[`d${dt.type}`] = 0
        }
      }

      // 前年の種別別売変額
      if (
        prevYearDaily &&
        prevEntry &&
        'discountEntries' in prevEntry &&
        prevEntry.discountEntries
      ) {
        for (const dt of DISCOUNT_TYPES) {
          entry[`prevD${dt.type}`] = prevEntry.discountEntries[dt.type] ?? 0
        }
      } else if (prevYearDaily) {
        for (const dt of DISCOUNT_TYPES) {
          entry[`prevD${dt.type}`] = null
        }
      }

      result.push(entry)
    }
    return result
  }, [daily, daysInMonth, year, month, prevYearDaily])

  const hasData = allData.some((d) => (d.discount as number) > 0)
  if (!hasData) return null

  const data = allData.filter(
    (d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd,
  )

  // 種別ラベルマップ（Tooltip / Legend 用）
  const labelMap: Record<string, string> = {
    cumRate: '累計売変率',
    discount: '売変合計',
    prevDiscount: '前年売変額',
    prevCumRate: '前年累計売変率',
  }
  for (const dt of DISCOUNT_TYPES) {
    labelMap[`d${dt.type}`] = dt.label
    labelMap[`prevD${dt.type}`] = `前年${dt.label}`
  }
  const hasPrev = !!prevYearDaily

  // KPI: 月間内訳サマリ
  const kpiEntries = discountEntries ?? []
  const totalDiscount = kpiEntries.reduce((s, e) => s + e.amount, 0)

  const activeType = DISCOUNT_TYPES.find((dt) => dt.type === activeCode)
  const activeLbl = activeType?.label ?? ''

  return (
    <Wrapper aria-label="売変推移チャート">
      <HeaderRow>
        <Title>
          {viewMode === 'stacked'
            ? '売変内訳分析（種別積上 / 累計売変率）'
            : `${activeLbl} 日別推移`}
        </Title>
        <Controls>
          <TabGroup>
            <Tab $active={viewMode === 'stacked'} onClick={() => setViewMode('stacked')}>
              全種別
            </Tab>
            {DISCOUNT_TYPES.map((dt, i) => (
              <Tab
                key={dt.type}
                $active={viewMode === 'individual' && activeCode === dt.type}
                $color={DISCOUNT_COLORS[i]}
                onClick={() => {
                  setViewMode('individual')
                  setActiveCode(dt.type)
                }}
              >
                {dt.label}
              </Tab>
            ))}
          </TabGroup>
        </Controls>
      </HeaderRow>

      {/* KPI サマリーカード */}
      {kpiEntries.length > 0 && (
        <KpiGrid>
          {DISCOUNT_TYPES.map((dt, i) => {
            const entry = kpiEntries.find((e) => e.type === dt.type)
            const amt = entry?.amount ?? 0
            const pct = totalDiscount > 0 ? amt / totalDiscount : 0
            const rate =
              totalGrossSales && totalGrossSales > 0 ? calculateShare(amt, totalGrossSales) : 0
            return (
              <KpiCard key={dt.type} $color={DISCOUNT_COLORS[i]}>
                <KpiLabel>
                  {dt.label}（{dt.type}）
                </KpiLabel>
                <KpiValue>{fmtCurrency(amt)}</KpiValue>
                <KpiSub>
                  構成比: {formatPercent(pct)} / 売変率: {formatPercent(rate)}
                </KpiSub>
              </KpiCard>
            )
          })}
        </KpiGrid>
      )}

      <div style={{ width: '100%', height: 280, minHeight: 0 }}>
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
              tickFormatter={toAxisYen}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toPct}
              width={45}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  const n = name as string
                  if (n === 'cumRate' || n === 'prevCumRate')
                    return [value != null ? toPct(value as number) : '-', labelMap[n] ?? n]
                  return [value != null ? toComma(value as number) : '-', labelMap[n] ?? n]
                },
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => labelMap[value] ?? value}
            />

            {viewMode === 'stacked' ? (
              DISCOUNT_TYPES.map((dt, i) => (
                <Bar
                  key={dt.type}
                  yAxisId="left"
                  dataKey={`d${dt.type}`}
                  stackId="discount"
                  fill={DISCOUNT_COLORS[i % DISCOUNT_COLORS.length]}
                  maxBarSize={16}
                  radius={i === DISCOUNT_TYPES.length - 1 ? [3, 3, 0, 0] : undefined}
                />
              ))
            ) : (
              <>
                {hasPrev && (
                  <Bar
                    yAxisId="left"
                    dataKey={`prevD${activeCode}`}
                    fill={
                      DISCOUNT_COLORS[DISCOUNT_TYPES.findIndex((dt) => dt.type === activeCode)] ??
                      '#ef4444'
                    }
                    fillOpacity={0.3}
                    maxBarSize={20}
                    radius={[3, 3, 0, 0]}
                  />
                )}
                <Bar
                  yAxisId="left"
                  dataKey={`d${activeCode}`}
                  fill={
                    DISCOUNT_COLORS[DISCOUNT_TYPES.findIndex((dt) => dt.type === activeCode)] ??
                    '#ef4444'
                  }
                  maxBarSize={20}
                  radius={[3, 3, 0, 0]}
                />
              </>
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumRate"
              stroke={ct.colors.orange}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasPrev && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prevCumRate"
                stroke={ct.colors.slate}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <DualPeriodSlider
        min={1}
        max={daysInMonth}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </Wrapper>
  )
})
