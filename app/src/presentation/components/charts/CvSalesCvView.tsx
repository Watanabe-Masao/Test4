/**
 * 売上×CV二軸グラフビュー — CvTimeSeriesChart のサブコンポーネント
 */
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from './SafeResponsiveContainer'
import type { useChartTheme } from './chartTheme'
import { CATEGORY_COLORS, formatDateKey } from './ChartParts'

interface SalesCvTooltipProps {
  active?: boolean
  payload?: readonly { dataKey: string; value: number; color: string; name: string }[]
  label?: string
  ct: ReturnType<typeof useChartTheme>
  fmtCurrency: (v: number | null) => string
}

function SalesCvTooltipContent({ active, payload, label, ct, fmtCurrency }: SalesCvTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
        maxWidth: 300,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((entry) => {
        const isSales = entry.dataKey.startsWith('sales_')
        const isCv = entry.dataKey.startsWith('cv_')
        return (
          <div key={entry.dataKey} style={{ color: entry.color, fontSize: '0.6rem' }}>
            {entry.name}
            {isSales
              ? `: ${fmtCurrency(entry.value)}`
              : isCv
                ? `: ${entry.value.toFixed(3)}`
                : `: ${entry.value}`}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  readonly data: readonly Record<string, number | string>[]
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmtCurrency: (v: number | null) => string
}

export function CvSalesCvView({ data, topCodes, categoryNames, ct, fmtCurrency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data as Record<string, number | string>[]}
        margin={{ top: 8, right: 50, left: 10, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
        <XAxis
          dataKey="dateKey"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          tickFormatter={formatDateKey}
        />
        <YAxis
          yAxisId="sales"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          tickFormatter={(v: number) => fmtCurrency(v)}
          label={{
            value: '売上',
            angle: -90,
            position: 'insideLeft',
            offset: 5,
            fontSize: 10,
            fill: ct.textMuted,
          }}
        />
        <YAxis
          yAxisId="cv"
          orientation="right"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          domain={[0, 'auto']}
          label={{
            value: 'CV',
            angle: 90,
            position: 'insideRight',
            offset: 5,
            fontSize: 10,
            fill: ct.textMuted,
          }}
        />
        <Tooltip content={<SalesCvTooltipContent ct={ct} fmtCurrency={fmtCurrency} />} />
        <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '0.6rem' }} />
        {topCodes.map((code, i) => (
          <Bar
            key={`sales_${code}`}
            yAxisId="sales"
            dataKey={`sales_${code}`}
            name={`${categoryNames.get(code) ?? code} (売上)`}
            fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
            fillOpacity={0.3}
            stackId="sales"
          />
        ))}
        {topCodes.map((code, i) => (
          <Line
            key={`cv_${code}`}
            yAxisId="cv"
            type="monotone"
            dataKey={`cv_${code}`}
            name={`${categoryNames.get(code) ?? code} (CV)`}
            stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
