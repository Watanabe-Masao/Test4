import { useState } from 'react'
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
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import type { DailyRecord } from '@/domain/models'

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

export type DailyChartMode = 'sales' | 'discount' | 'all'

/** 表示形式 */
type ViewType = 'standard' | 'salesOnly' | 'discountOnly' | 'movingAvg' | 'area'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number }>
  mode?: DailyChartMode
}

/** N日移動平均を計算 */
function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  salesOnly: '売上',
  discountOnly: '売変',
  movingAvg: '移動平均',
  area: 'エリア',
}

const VIEW_TITLES: Record<ViewType, string> = {
  standard: '日別売上・売変推移',
  salesOnly: '日別売上推移（当年 vs 前年）',
  discountOnly: '日別売変推移（当年 vs 前年）',
  movingAvg: '7日移動平均推移',
  area: '日別売上推移（エリア）',
}

const MODE_TO_VIEW: Record<DailyChartMode, ViewType> = {
  all: 'standard',
  sales: 'salesOnly',
  discount: 'discountOnly',
}

export function DailySalesChart({ daily, daysInMonth, prevYearDaily, mode = 'all' }: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>(() => MODE_TO_VIEW[mode])

  const rawSales: number[] = []
  const rawDiscount: number[] = []
  const rawPrevDiscount: number[] = []
  const baseData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const sales = rec?.sales ?? 0
    const discount = rec?.discountAbsolute ?? 0
    rawSales.push(sales)
    rawDiscount.push(discount)
    const prevEntry = prevYearDaily?.get(d)
    const prevSales = prevEntry?.sales ?? null
    const prevDiscount = prevEntry?.discount ?? null
    rawPrevDiscount.push(prevEntry?.discount ?? 0)
    baseData.push({ day: d, sales, discount, prevYearSales: prevSales, prevYearDiscount: prevDiscount })
  }

  // 7日移動平均
  const salesMa7 = movingAverage(rawSales, 7)
  const discountMa7 = movingAverage(rawDiscount, 7)
  const prevDiscountMa7 = movingAverage(rawPrevDiscount, 7)

  const data = baseData.map((d, i) => ({
    ...d,
    salesMa7: salesMa7[i],
    discountMa7: discountMa7[i],
    prevDiscountMa7: prevDiscountMa7[i],
  }))

  const hasPrev = !!prevYearDaily

  const allLabels: Record<string, string> = {
    sales: '売上',
    prevYearSales: '前年同曜日売上',
    discount: '売変額',
    prevYearDiscount: '前年売変額',
    salesMa7: '売上7日移動平均',
    discountMa7: '売変額7日移動平均',
    prevDiscountMa7: '前年売変7日移動平均',
  }

  // 右Y軸が必要か（売変系を表示する場合）
  const needRightAxis = view === 'standard' || view === 'discountOnly'

  return (
    <Wrapper>
      <HeaderRow>
        <Title>{VIEW_TITLES[view]}</Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      </HeaderRow>
      <ResponsiveContainer width="100%" height="88%">
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
            tickFormatter={toManYen}
            width={50}
          />
          {needRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
              width={45}
            />
          )}
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              return [value != null ? toComma(value as number) : '-', allLabels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
          />

          {/* ── Standard: 売上+前年売上=棒、売変+前年売変=点線 ── */}
          {view === 'standard' && (
            <>
              <Bar yAxisId="left" dataKey="sales" fill="url(#salesGrad)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              {hasPrev && (
                <Bar yAxisId="left" dataKey="prevYearSales" fill="url(#prevSalesGrad)" radius={[3, 3, 0, 0]} maxBarSize={14} />
              )}
              <Line
                yAxisId="right" type="monotone" dataKey="discount"
                stroke={ct.colors.danger} strokeWidth={2} strokeDasharray="6 3"
                dot={false} connectNulls
              />
              {hasPrev && (
                <Line
                  yAxisId="right" type="monotone" dataKey="prevYearDiscount"
                  stroke={ct.colors.orange} strokeWidth={1.5} strokeDasharray="4 2"
                  dot={false} connectNulls
                />
              )}
            </>
          )}

          {/* ── Sales Only: 売上+前年売上 棒グラフ + 移動平均 ── */}
          {view === 'salesOnly' && (
            <>
              <Bar yAxisId="left" dataKey="sales" fill="url(#salesGrad)" radius={[3, 3, 0, 0]} maxBarSize={20} />
              {hasPrev && (
                <Bar yAxisId="left" dataKey="prevYearSales" fill="url(#prevSalesGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              )}
              <Line
                yAxisId="left" type="monotone" dataKey="salesMa7"
                stroke={ct.colors.cyanDark} strokeWidth={2}
                dot={false} connectNulls
              />
            </>
          )}

          {/* ── Discount Only: 売変+前年売変 棒グラフ + 移動平均 ── */}
          {view === 'discountOnly' && (
            <>
              <Bar yAxisId="right" dataKey="discount" fill={ct.colors.danger} radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.7} />
              {hasPrev && (
                <Bar yAxisId="right" dataKey="prevYearDiscount" fill={ct.colors.orange} radius={[3, 3, 0, 0]} maxBarSize={16} opacity={0.5} />
              )}
              <Line
                yAxisId="right" type="monotone" dataKey="discountMa7"
                stroke={ct.colors.dangerDark} strokeWidth={2}
                dot={false} connectNulls
              />
              {hasPrev && (
                <Line
                  yAxisId="right" type="monotone" dataKey="prevDiscountMa7"
                  stroke={ct.colors.warningDark} strokeWidth={1.5} strokeDasharray="5 3"
                  dot={false} connectNulls
                />
              )}
            </>
          )}

          {/* ── Moving Average: すべて線グラフ ── */}
          {view === 'movingAvg' && (
            <>
              <Line
                yAxisId="left" type="monotone" dataKey="salesMa7"
                stroke={ct.colors.primary} strokeWidth={2.5}
                dot={false} connectNulls
              />
              <Line
                yAxisId="left" type="monotone" dataKey="discountMa7"
                stroke={ct.colors.danger} strokeWidth={2} strokeDasharray="6 3"
                dot={false} connectNulls
              />
              {hasPrev && (
                <Line
                  yAxisId="left" type="monotone" dataKey="prevDiscountMa7"
                  stroke={ct.colors.orange} strokeWidth={1.5} strokeDasharray="4 2"
                  dot={false} connectNulls
                />
              )}
            </>
          )}

          {/* ── Area: 売上エリアチャート + 前年エリア ── */}
          {view === 'area' && (
            <>
              <Area
                yAxisId="left" type="monotone" dataKey="sales"
                fill="url(#salesAreaGrad)" stroke={ct.colors.primary} strokeWidth={2}
              />
              {hasPrev && (
                <Area
                  yAxisId="left" type="monotone" dataKey="prevYearSales"
                  fill="url(#prevSalesAreaGrad)" stroke={ct.colors.slate} strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}
              <Line
                yAxisId="left" type="monotone" dataKey="salesMa7"
                stroke={ct.colors.cyanDark} strokeWidth={2}
                dot={false} connectNulls
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
