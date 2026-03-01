/**
 * DailySalesChart 描画コンポーネント
 *
 * recharts による日別チャート描画のみを担う。
 * データ変換・状態管理は親コンポーネントと useDailySalesData が担当。
 */
import { memo } from 'react'
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
  Cell,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { type ChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import type { DailySalesDataResult } from './useDailySalesData'

export type ViewType =
  | 'standard'
  | 'salesOnly'
  | 'discountOnly'
  | 'movingAvg'
  | 'area'
  | 'customers'
  | 'txValue'
  | 'prevYearCum'
  | 'discountImpact'

interface Props {
  data: DailySalesDataResult['data']
  view: ViewType
  isWf: boolean
  hasPrev: boolean
  ct: ChartTheme
  needRightAxis: boolean
  showSalesMa: boolean
  wfLegendPayload: { value: string; type: 'rect'; color: string }[] | undefined
}

const ALL_LABELS: Record<string, string> = {
  sales: '売上',
  prevYearSales: '前年同曜日売上',
  discount: '売変額',
  prevYearDiscount: '前年売変額',
  salesMa7: '売上7日移動平均',
  discountMa7: '売変額7日移動平均',
  prevDiscountMa7: '前年売変7日移動平均',
  customers: '客数',
  prevCustomers: '前年客数',
  txValue: '当年客単価',
  prevTxValue: '前年客単価',
  currentCum: '当年累計',
  prevYearCum: '前年同曜日累計',
  cumDiscountRate: '累計売変率',
  wfSalesUp: '増加',
  wfSalesDown: '減少',
  wfDiscUp: '増加',
  wfDiscDown: '減少',
  wfCustUp: '増加',
  wfCustDown: '減少',
}

export const DailySalesChartBody = memo(function DailySalesChartBody({
  data,
  view,
  isWf,
  hasPrev,
  ct,
  needRightAxis,
  showSalesMa,
  wfLegendPayload,
}: Props) {
  const fmt = useCurrencyFormatter()

  // recharts requires a mutable array
  const chartData = data as unknown as Record<string, unknown>[]

  return (
    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="82%">
      <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
          tickFormatter={
            view === 'customers'
              ? (v: number) => `${v}人`
              : view === 'txValue'
                ? (v: number) => `${toComma(v)}円`
                : fmt
          }
          width={view === 'txValue' ? 60 : 50}
        />
        {needRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={
              view === 'customers'
                ? (v: number) => `${toComma(v)}円`
                : view === 'discountImpact'
                  ? (v: number) => toPct(v)
                  : fmt
            }
            width={view === 'customers' || view === 'discountImpact' ? 55 : 45}
          />
        )}
        <Tooltip
          contentStyle={tooltipStyle(ct)}
          formatter={(value, name) => {
            const n = name as string
            if (n.includes('Base') || n === 'wfSalesCum' || n === 'wfDiscCum' || n === 'wfCustCum')
              return [null, null] as unknown as [string, string]
            if (value == null) return ['-', ALL_LABELS[n] ?? String(name)]
            if (n === 'cumDiscountRate') return [toPct(value as number), ALL_LABELS[n] ?? n]
            const suffix =
              n === 'customers' || n === 'prevCustomers' || n.includes('Cust')
                ? '人'
                : n === 'txValue' || n === 'prevTxValue'
                  ? '円'
                  : ''
            return [toComma(value as number) + suffix, ALL_LABELS[n] ?? n]
          }}
          labelFormatter={(label) => `${label}日`}
        />
        <Legend
          wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          formatter={(value) => ALL_LABELS[value] ?? value}
          {...(wfLegendPayload ? { payload: wfLegendPayload as never } : {})}
        />

        {/* ── ウォーターフォール: 売上系 ── */}
        {isWf && (view === 'standard' || view === 'salesOnly') && (
          <>
            <Bar
              yAxisId="left"
              dataKey="wfSalesBase"
              stackId="wfS"
              fill="transparent"
              maxBarSize={16}
              legendType="none"
            />
            <Bar
              yAxisId="left"
              dataKey="wfSalesUp"
              stackId="wfS"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="wfSalesDown"
              stackId="wfS"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />
              ))}
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wfSalesCum"
              stroke={ct.colors.primary}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
              legendType="none"
            />
            <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
          </>
        )}

        {/* ── ウォーターフォール: 売変系 ── */}
        {isWf && view === 'discountOnly' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="wfDiscBase"
              stackId="wfD"
              fill="transparent"
              maxBarSize={16}
              legendType="none"
            />
            <Bar
              yAxisId="left"
              dataKey="wfDiscUp"
              stackId="wfD"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="wfDiscDown"
              stackId="wfD"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />
              ))}
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wfDiscCum"
              stroke={ct.colors.dangerDark}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
              legendType="none"
            />
            <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
          </>
        )}

        {/* ── ウォーターフォール: 客数系 ── */}
        {isWf && view === 'customers' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="wfCustBase"
              stackId="wfC"
              fill="transparent"
              maxBarSize={16}
              legendType="none"
            />
            <Bar
              yAxisId="left"
              dataKey="wfCustUp"
              stackId="wfC"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="wfCustDown"
              stackId="wfC"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.danger} fillOpacity={0.75} />
              ))}
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wfCustCum"
              stroke={ct.colors.info}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
              legendType="none"
            />
            <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />
          </>
        )}

        {/* ── Standard: 売上+前年売上=棒、売変+前年売変=点線 ── */}
        {!isWf && view === 'standard' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            {hasPrev && (
              <Bar
                yAxisId="left"
                dataKey="prevYearSales"
                fill="url(#prevSalesGrad)"
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="discount"
              stroke={ct.colors.danger}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
            />
            {hasPrev && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prevYearDiscount"
                stroke={ct.colors.orange}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            )}
          </>
        )}

        {/* ── Sales Only ── */}
        {!isWf && view === 'salesOnly' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            {hasPrev && (
              <Bar
                yAxisId="left"
                dataKey="prevYearSales"
                fill="url(#prevSalesGrad)"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="salesMa7"
              stroke={ct.colors.cyanDark}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </>
        )}

        {/* ── Discount Only ── */}
        {!isWf && view === 'discountOnly' && (
          <>
            <Bar
              yAxisId="right"
              dataKey="discount"
              fill={ct.colors.danger}
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
              opacity={0.7}
            />
            {hasPrev && (
              <Bar
                yAxisId="right"
                dataKey="prevYearDiscount"
                fill={ct.colors.orange}
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
                opacity={0.5}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="discountMa7"
              stroke={ct.colors.dangerDark}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasPrev && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prevDiscountMa7"
                stroke={ct.colors.warningDark}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </>
        )}

        {/* ── Moving Average ── */}
        {view === 'movingAvg' && (
          <>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="discountMa7"
              stroke={ct.colors.danger}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasPrev && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevDiscountMa7"
                stroke={ct.colors.orange}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            )}
            {showSalesMa && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="salesMa7"
                stroke={ct.colors.primary}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            )}
          </>
        )}

        {/* ── Area ── */}
        {view === 'area' && (
          <>
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              fill="url(#salesAreaGrad)"
              stroke={ct.colors.primary}
              strokeWidth={2}
            />
            {hasPrev && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="prevYearSales"
                fill="url(#prevSalesAreaGrad)"
                stroke={ct.colors.slate}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="salesMa7"
              stroke={ct.colors.cyanDark}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </>
        )}

        {/* ── Customers ── */}
        {!isWf && view === 'customers' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="customers"
              fill={ct.colors.info}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              opacity={0.75}
            />
            {hasPrev && (
              <Bar
                yAxisId="left"
                dataKey="prevCustomers"
                fill={ct.colors.slate}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
                opacity={0.5}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="txValue"
              stroke={ct.colors.purple}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
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
            <Bar
              yAxisId="left"
              dataKey="txValue"
              fill="url(#txValGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
            />
            {hasPrev && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevTxValue"
                stroke={ct.colors.slate}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
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
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="prevYearCum"
              stroke={ct.colors.slate}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#prevCumArea)"
              dot={false}
              connectNulls
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="currentCum"
              stroke={ct.colors.primary}
              strokeWidth={2.5}
              fill="url(#currentCumArea)"
              dot={false}
            />
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
            <Bar
              yAxisId="left"
              dataKey="discount"
              fill="url(#discImpactGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumDiscountRate"
              stroke={ct.colors.orange}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
})
