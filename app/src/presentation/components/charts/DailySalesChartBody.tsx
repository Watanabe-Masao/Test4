/**
 * DailySalesChart 描画コンポーネント
 *
 * recharts による日別チャート描画のみを担う。
 * データ変換・状態管理は親コンポーネントと useDailySalesData が担当。
 *
 * ビュー構成:
 * - standard: 売上棒+前年棒+売変線+移動平均線
 * - prevYearCum: 実績・前年・予算の累計/単日切替
 * - vsLastYear: 実績=棒、前年=線、前年差累計WF
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
import { type ChartTheme, toAxisYen, toComma } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import type { DailySalesDataResult } from './useDailySalesData'

export type ViewType = 'standard' | 'prevYearCum' | 'vsLastYear'

interface Props {
  data: DailySalesDataResult['data']
  view: ViewType
  isWf: boolean
  hasPrev: boolean
  ct: ChartTheme
  needRightAxis: boolean
  cumMode: 'cumulative' | 'daily'
  wfLegendPayload: { value: string; type: 'rect'; color: string }[] | undefined
}

const ALL_LABELS: Record<string, string> = {
  sales: '売上',
  prevYearSales: '前年同曜日売上',
  discount: '売変額',
  prevYearDiscount: '前年売変額',
  salesMa7: '売上7日移動平均',
  currentCum: '当年累計',
  prevYearCum: '前年同曜日累計',
  budgetCum: '予算累計',
  budgetDaily: '予算（日割）',
  yoyDiff: '前年差',
  yoyDiffCum: '前年差累計',
  wfSalesUp: '増加',
  wfSalesDown: '減少',
  wfYoyUp: '前年差+',
  wfYoyDown: '前年差-',
}

export const DailySalesChartBody = memo(function DailySalesChartBody({
  data,
  view,
  isWf,
  hasPrev,
  ct,
  needRightAxis,
  cumMode,
  wfLegendPayload,
}: Props) {
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
          <linearGradient id="currentCumArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="prevCumArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.15} />
            <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="budgetCumArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.15} />
            <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.02} />
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
          tickFormatter={toAxisYen}
          width={50}
        />
        {needRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toAxisYen}
            width={45}
          />
        )}
        <Tooltip
          content={createChartTooltip({
            ct,
            formatter: (value, name) => {
              const n = name as string
              if (n.includes('Base') || n === 'wfSalesCum' || n === 'wfYoyCum')
                return [null, null] as unknown as [string, string]
              if (value == null) return ['-', ALL_LABELS[n] ?? String(name)]
              return [toComma(value as number), ALL_LABELS[n] ?? n]
            },
            labelFormatter: (label) => `${label}日`,
          })}
        />
        <Legend
          wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          formatter={(value) => ALL_LABELS[value] ?? value}
          {...(wfLegendPayload ? { payload: wfLegendPayload as never } : {})}
        />

        {/* ── ウォーターフォール: 売上系 (standard) ── */}
        {isWf && view === 'standard' && (
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

        {/* ── ウォーターフォール: 前年差 (vsLastYear) ── */}
        {isWf && view === 'vsLastYear' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="wfYoyBase"
              stackId="wfY"
              fill="transparent"
              maxBarSize={16}
              legendType="none"
            />
            <Bar
              yAxisId="left"
              dataKey="wfYoyUp"
              stackId="wfY"
              maxBarSize={16}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={ct.colors.success} fillOpacity={0.75} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="wfYoyDown"
              stackId="wfY"
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
              dataKey="wfYoyCum"
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

        {/* ── Standard: 売上+前年売上=棒、売変=点線、移動平均線 ── */}
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

        {/* ── prevYearCum 累計モード: 実績・前年・予算の累計Area ── */}
        {!isWf && view === 'prevYearCum' && cumMode === 'cumulative' && (
          <>
            {hasPrev && (
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
            )}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="budgetCum"
              stroke={ct.colors.success}
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#budgetCumArea)"
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

        {/* ── prevYearCum 単日モード: 実績・前年・予算の日別棒 ── */}
        {!isWf && view === 'prevYearCum' && cumMode === 'daily' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
            />
            {hasPrev && (
              <Bar
                yAxisId="left"
                dataKey="prevYearSales"
                fill="url(#prevSalesGrad)"
                radius={[3, 3, 0, 0]}
                maxBarSize={12}
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="budgetDaily"
              stroke={ct.colors.success}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
            />
          </>
        )}

        {/* ── vsLastYear 累計モード: 当年累計=棒、前年累計=線 ── */}
        {!isWf && view === 'vsLastYear' && cumMode === 'cumulative' && hasPrev && (
          <>
            <Bar
              yAxisId="left"
              dataKey="currentCum"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="prevYearCum"
              stroke={ct.colors.slate}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="yoyDiffCum"
              stroke={ct.colors.success}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
            />
          </>
        )}

        {/* ── vsLastYear 単日モード: 当年=棒、前年=線 ── */}
        {!isWf && view === 'vsLastYear' && cumMode === 'daily' && (
          <>
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            {hasPrev && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevYearSales"
                stroke={ct.colors.slate}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            )}
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
})
