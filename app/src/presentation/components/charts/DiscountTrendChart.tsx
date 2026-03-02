import { useState, useMemo, memo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import { DayRangeSlider } from './DayRangeSlider'
import { useDayRange } from './useDayRange'
import type { DailyRecord, DiscountEntry } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import { safeDivide, formatCurrency, formatPercent } from '@/domain/calculations/utils'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
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
  flex-wrap: wrap;
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean; $color?: string }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, $color, theme }) =>
    $active ? ($color ?? theme.colors.palette.primary) : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const KpiCard = styled.div<{ $color: string }>`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
`

const KpiLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const KpiValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const KpiSub = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

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
  /** 前年日次データ（売変額の前年比較ライン用） */
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number }>
}

/** 売変内訳分析チャート（71-74種別切替対応） */
export const DiscountTrendChart = memo(function DiscountTrendChart({
  daily,
  daysInMonth,
  discountEntries,
  totalGrossSales,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)
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

      const cumRate = safeDivide(cumDiscount, cumGrossSales, 0)

      // 前年売変比較
      const prevEntry = prevYearDaily?.get(d)
      const prevDayDiscount = prevEntry?.discount ?? 0
      prevCumDiscount += prevDayDiscount
      // 前年粗売上は不明なので売上で近似（データソースの制約）
      prevCumGrossSales += prevEntry?.sales ?? 0
      const prevCumRate =
        prevCumGrossSales > 0 ? safeDivide(prevCumDiscount, prevCumGrossSales, 0) : null

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

      result.push(entry)
    }
    return result
  }, [daily, daysInMonth, prevYearDaily])

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
              totalGrossSales && totalGrossSales > 0 ? safeDivide(amt, totalGrossSales, 0) : 0
            return (
              <KpiCard key={dt.type} $color={DISCOUNT_COLORS[i]}>
                <KpiLabel>
                  {dt.label}（{dt.type}）
                </KpiLabel>
                <KpiValue>{formatCurrency(amt)}</KpiValue>
                <KpiSub>
                  構成比: {formatPercent(pct, 1)} / 売変率: {formatPercent(rate)}
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
              tickFormatter={fmt}
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
              contentStyle={tooltipStyle(ct)}
              formatter={(value, name) => {
                const n = name as string
                if (n === 'cumRate' || n === 'prevCumRate')
                  return [value != null ? toPct(value as number) : '-', labelMap[n] ?? n]
                return [value != null ? toComma(value as number) : '-', labelMap[n] ?? n]
              }}
              labelFormatter={(label) => `${label}日`}
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
      <DayRangeSlider
        min={1}
        max={daysInMonth}
        start={rangeStart}
        end={rangeEnd}
        onChange={setRange}
      />
    </Wrapper>
  )
})
